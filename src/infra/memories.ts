/**
 * 用户记忆（Memories）管理
 *
 * 存储：~/.cuckoo/memories.json（用户级，所有项目通用）
 * 可用环境变量 CUCKOO_HOME 覆盖（测试隔离）。
 *
 * 数据模型：
 *   { id: string, text: string, createdAt: number, updatedAt: number }
 *
 * 记忆内容会注入系统提示词的「## 用户记忆」章节，让模型了解用户习惯。
 * 首次读取时若文件不存在，返回空数组（不写默认）。
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { isMemoriesEnabled } from './config.js';

export interface Memory {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

/** 用户级目录（可用 CUCKOO_HOME 覆盖，供测试隔离） */
function getUserDir(): string {
  const override = process.env.CUCKOO_HOME;
  return override ? override : path.join(os.homedir(), '.cuckoo');
}

function getMemoriesFile(): string {
  return path.join(getUserDir(), 'memories.json');
}

/** 由内容派生稳定 id（同一内容永远得到同一 id，避免每次读取都变） */
function stableId(text: string): string {
  return 'mem-' + crypto.createHash('sha1').update(text).digest('hex').slice(0, 16);
}

/**
 * 文件锁：同进程用内存互斥，跨进程用锁文件（wx 独占创建）。
 * 防止「读-改-写」竞态导致记忆丢失。
 */
let _memLock: Promise<void> = Promise.resolve();
function withMemLock<T>(fn: () => T): T {
  const file = getMemoriesFile() + '.lock';
  const deadline = Date.now() + 3000;
  let fd: number | null = null;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    while (Date.now() < deadline) {
      try { fd = fs.openSync(file, 'wx'); break; }
      catch (e: any) {
        if (e.code !== 'EEXIST') break;
        try { if (Date.now() - fs.statSync(file).mtimeMs > 5000) fs.unlinkSync(file); } catch (_) {}
        const end = Date.now() + 20;
        while (Date.now() < end) { /* 同步等待 20ms */ }
      }
    }
    return fn();
  } finally {
    if (fd !== null) { try { fs.closeSync(fd); } catch (_) {} try { fs.unlinkSync(file); } catch (_) {} }
  }
}
/** 校验并规整单条记忆 */
function normalizeMemory(raw: any): Memory | null {
  if (!raw || typeof raw !== 'object') return null;
  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  if (!text) return null;
  const now = Date.now();
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : stableId(text),
    text,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
  };
}

/** 读取全部记忆（文件不存在返回空数组） */
function listMemories(): Memory[] {
  const file = getMemoriesFile();
  try {
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (Array.isArray(raw)) {
        return raw.map(normalizeMemory).filter(Boolean) as Memory[];
      }
    }
  } catch (err: any) {
    console.error('[Memories] 读取失败:', err.message);
    try { fs.renameSync(file, file + '.corrupt-' + Date.now()); } catch (_) {}
  }
  return [];
}

/** 整体覆盖写入 */
function saveMemories(list: any): boolean {
  const file = getMemoriesFile();
  try {
    const arr = Array.isArray(list) ? list : [];
    const clean = arr.map(normalizeMemory).filter(Boolean) as Memory[];
    fs.mkdirSync(path.dirname(file), { recursive: true });
    // 原子写入：先写临时文件 → fsync → rename 替换
    const tmp = file + '.' + process.pid + '.' + Date.now() + '.tmp';
    try {
      const fd = fs.openSync(tmp, 'w');
      try { fs.writeFileSync(fd, JSON.stringify(clean, null, 2), 'utf-8'); fs.fsyncSync(fd); }
      finally { fs.closeSync(fd); }
      fs.renameSync(tmp, file);
    } catch (e) {
      try { fs.unlinkSync(tmp); } catch (_) {}
      throw e;
    }
    console.log('[Memories] 已写入:', file);
    return true;
  } catch (err: any) {
    console.error('[Memories] 写入失败:', err.message);
    return false;
  }
}

/* 不再限制单条长度 / 章节总长 / 总条数（用户要求去掉硬限制） */

/**
 * 新增一条记忆，返回新记忆。
 * - text 为空返回 null
 * - 重复内容（忽略首尾空白后完全相同）不重复添加，返回已存在的那条
 */
function addMemory(text: string): Memory | null {
  const t = typeof text === 'string' ? text.trim() : '';
  if (!t) return null;

  return withMemLock(() => {
    const list = listMemories();
    const existing = list.find((m) => m.text === t);
    if (existing) return existing;

    const now = Date.now();
    const mem: Memory = {
      id: stableId(t + now),
      text: t,
      createdAt: now,
      updatedAt: now,
    };
    list.push(mem);
    return saveMemories(list) ? mem : null;
  });
}

/** 按 id 删除一条记忆 */
function removeMemory(id: string): boolean {
  return withMemLock(() => {
    const list = listMemories();
    const next = list.filter((m) => m.id !== id);
    if (next.length === list.length) return false;
    return saveMemories(next);
  });
}
/**
 * 按 id 修改一条记忆的正文（保留 id / createdAt，刷新 updatedAt）。
 * 返回修改后的记忆；id 不存在或 text 为空时返回 null。
 */
function updateMemory(id: string, text: string): Memory | null {
  const sid = typeof id === 'string' ? id.trim() : '';
  const t = typeof text === 'string' ? text.trim() : '';
  if (!sid || !t) return null;
  return withMemLock(() => {
    const list = listMemories();
    const idx = list.findIndex((m) => m.id === sid);
    if (idx < 0) return null;
    // 改后与另一条重复：合并（删本条，返回已有那条）
    const dupIdx = list.findIndex((m, i) => i !== idx && m.text === t);
    if (dupIdx >= 0) {
      const dup = list[dupIdx];
      const next = list.filter((_, i) => i !== idx);
      return saveMemories(next) ? dup : null;
    }
    list[idx] = { ...list[idx], text: t, updatedAt: Date.now() };
    return saveMemories(list) ? list[idx] : null;
  });
}

/**
 * 构建注入提示词的「用户记忆」章节。
 * 无记忆时返回空串（不注入章节）。
 */
function buildMemorySection(): string {
  // 记忆功能关闭时：不注入章节
  if (!isMemoriesEnabled()) return '';
  const list = listMemories();
  if (!list.length) return '';
  const lines = list.map((m) => '- ' + m.text.replace(/\n/g, ' '));
  const body = lines.join('\n');
  return [
    '## 用户记忆',
    '',
    '以下是用户过往沉淀的偏好与习惯，请在后续工作中遵循（除非用户明确改变要求）：',
    '',
    body,
  ].join('\n');
}

export { listMemories, saveMemories, addMemory, removeMemory, updateMemory, buildMemorySection, getMemoriesFile };
