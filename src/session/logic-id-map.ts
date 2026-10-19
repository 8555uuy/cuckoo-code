/**
 * 逻辑 ID（LogicId）↔ 网页 ID（WebId）映射表（全局一张表，跨 profile）。
 *
 * 背景：DSH 的 `agents.create` 要求调用方指定 `sessionId`（LogicId），
 * 而 Cuckoo 的网页 AI 只能事后从 URL 拿 `webId`。两套 ID 必须翻译。
 *
 * 治理：Branded Type（WebId / LogicId）——把"传错 ID"变成编译期错误。
 * 唯一入口：本文件的 `createLogicIdMap()`；其他地方不允许同时持有两套 ID。
 *
 * 生命周期：
 *  - 系统触发（用户手动聊天）：URL 变化时 `ensureLogicId(webId)` → logicId = webId
 *  - 插件触发（dsh-tasks 等）：`bind(logicId, webId)`（网页 id 出现后）
 *  - 清理：不做（Cuckoo 没有"删除会话"逻辑，映射不会变脏）
 *  - 历史数据：启动时扫描所有 webId，补 logicId = webId（由调用方负责）
 */

import fs from 'node:fs';
import path from 'node:path';
import type { WebId, LogicId } from './ids.js';

/** 落盘结构：双向映射（反查是 O(1)） */
interface MapFile {
  logicToWeb: Record<string, string>;
  webToLogic: Record<string, string>;
}

interface LogicIdMap {
  /** logicId → webId（未绑定返回 null） */
  webIdOf(logicId: LogicId): WebId | null;
  /** webId → logicId（未绑定返回 null） */
  logicIdOf(webId: WebId): LogicId | null;
  /** 双向绑定（插件触发） */
  bind(logicId: LogicId, webId: WebId): void;
  /** 系统触发：未绑定时 logicId = webId；已绑定则返回已有 logicId */
  ensureLogicId(webId: WebId): LogicId;
  /** logicId 是否已绑定 */
  has(logicId: LogicId): boolean;
  /** 强制从磁盘重读（测试用） */
  reload(): void;
}

/**
 * 创建映射表实例。
 * @param storeDir 存储目录（通常是 app.getPath('userData')；测试可传临时目录）
 */
function createLogicIdMap(storeDir: string): LogicIdMap {
  const FILE = path.join(storeDir, 'logic-id-map.json');
  let data: MapFile = { logicToWeb: {}, webToLogic: {} };

  function load(): MapFile {
    try {
      if (fs.existsSync(FILE)) {
        const raw = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
        const logicToWeb: Record<string, string> = {};
        const webToLogic: Record<string, string> = {};
        if (raw && typeof raw.logicToWeb === 'object' && raw.logicToWeb) {
          for (const [k, v] of Object.entries(raw.logicToWeb)) {
            if (typeof v === 'string') logicToWeb[k] = v;
          }
        }
        if (raw && typeof raw.webToLogic === 'object' && raw.webToLogic) {
          for (const [k, v] of Object.entries(raw.webToLogic)) {
            if (typeof v === 'string') webToLogic[k] = v;
          }
        }
        // 兼容"只存了单向"的旧文件：用 logicToWeb 补全 webToLogic
        for (const [lid, wid] of Object.entries(logicToWeb)) {
          if (!webToLogic[wid]) webToLogic[wid] = lid;
        }
        return { logicToWeb, webToLogic };
      }
    } catch (err: any) {
      console.error('[Cuckoo Code] 读取 logic-id-map 失败:', err.message);
    }
    return { logicToWeb: {}, webToLogic: {} };
  }

  function save(next: MapFile): void {
    try {
      fs.writeFileSync(FILE, JSON.stringify(next, null, 2), 'utf-8');
      data = next;
    } catch (err: any) {
      console.error('[Cuckoo Code] 写入 logic-id-map 失败:', err.message);
      data = next;
    }
  }

  data = load();

  return {
    webIdOf(logicId: LogicId): WebId | null {
      if (!logicId) return null;
      const v = data.logicToWeb[logicId];
      return v ? (v as WebId) : null;
    },

    logicIdOf(webId: WebId): LogicId | null {
      if (!webId) return null;
      const v = data.webToLogic[webId];
      return v ? (v as LogicId) : null;
    },

    bind(logicId: LogicId, webId: WebId): void {
      if (!logicId || !webId) return;
      // 已一致 → 不写盘
      if (data.logicToWeb[logicId] === webId && data.webToLogic[webId] === logicId) return;
      const next: MapFile = {
        logicToWeb: { ...data.logicToWeb, [logicId]: webId },
        webToLogic: { ...data.webToLogic, [webId]: logicId },
      };
      save(next);
    },

    ensureLogicId(webId: WebId): LogicId {
      if (!webId) throw new Error('ensureLogicId: webId 为空');
      const existing = data.webToLogic[webId];
      if (existing) return existing as LogicId;
      // 系统触发：logicId = webId
      const lid = webId as unknown as LogicId;
      const next: MapFile = {
        logicToWeb: { ...data.logicToWeb, [lid]: webId },
        webToLogic: { ...data.webToLogic, [webId]: lid },
      };
      save(next);
      return lid;
    },

    has(logicId: LogicId): boolean {
      if (!logicId) return false;
      return Object.prototype.hasOwnProperty.call(data.logicToWeb, logicId);
    },

    reload(): void {
      data = load();
    },
  };
}

export { createLogicIdMap };
export type { WebId, LogicId, LogicIdMap };
