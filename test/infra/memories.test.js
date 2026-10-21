'use strict';
import { test, beforeEach } from 'vitest';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 用 CUCKOO_HOME 隔离
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cuckoo-mem-'));
process.env.CUCKOO_HOME = TMP;

const { listMemories, saveMemories, addMemory, removeMemory, updateMemory, buildMemorySection } = await import('../../src/infra/memories.js');
const { setMemoriesEnabled } = await import('../../src/infra/config.js');

beforeEach(() => {
  try { fs.rmSync(path.join(TMP, 'memories.json'), { force: true }); } catch {}
  try { fs.rmSync(path.join(TMP, 'config.json'), { force: true }); } catch {}
  setMemoriesEnabled(false); // 默认关闭
});

test('初始为空', () => {
  assert.deepStrictEqual(listMemories(), []);
});

test('addMemory 新增并持久化', () => {
  const m = addMemory('用户偏好中文');
  assert.ok(m && m.id && m.text === '用户偏好中文');
  assert.strictEqual(listMemories().length, 1);
});

test('addMemory 空文本返回 null', () => {
  assert.strictEqual(addMemory('   '), null);
  assert.strictEqual(listMemories().length, 0);
});

test('removeMemory 删除', () => {
  const m = addMemory('x');
  assert.strictEqual(removeMemory(m.id), true);
  assert.strictEqual(listMemories().length, 0);
  assert.strictEqual(removeMemory('不存在'), false);
});

test('saveMemories 覆盖并过滤非法项', () => {
  saveMemories([{ text: 'a' }, { text: '' }, null, { text: 'b' }]);
  const list = listMemories();
  assert.strictEqual(list.length, 2);
});

test('buildMemorySection 无记忆返回空串', () => {
  setMemoriesEnabled(true);
  assert.strictEqual(buildMemorySection(), '');
});

test('记忆功能默认关闭时 buildMemorySection 返回空串（即使有记忆）', () => {
  setMemoriesEnabled(true);
  addMemory('开启后写入的记忆');
  setMemoriesEnabled(false);
  assert.strictEqual(buildMemorySection(), '');
});

test('buildMemorySection 有记忆返回章节（需开启功能）', () => {
  setMemoriesEnabled(true);
  addMemory('习惯1');
  addMemory('习惯2');
  const s = buildMemorySection();
  assert.ok(s.includes('## 用户记忆'));
  assert.ok(s.includes('习惯1'));
  assert.ok(s.includes('习惯2'));
});

// ===== 去重 / 无上限（用户要求去掉硬限制）=====

test('addMemory 重复内容不重复添加', () => {
  const a = addMemory('同样的话');
  const b = addMemory('同样的话');
  assert.strictEqual(a.id, b.id);
  assert.strictEqual(listMemories().length, 1);
});

test('addMemory 首尾空白不同视为重复', () => {
  const a = addMemory('内容');
  const b = addMemory('  内容  ');
  assert.strictEqual(a.id, b.id);
  assert.strictEqual(listMemories().length, 1);
});

test('addMemory 不再截断超长内容', () => {
  const m = addMemory('x'.repeat(800));
  assert.strictEqual(m.text.length, 800);
});

test('addMemory 不再丢弃超过 200 条的旧记忆', () => {
  for (let i = 0; i < 205; i++) addMemory('记忆' + i);
  const list = listMemories();
  assert.strictEqual(list.length, 205);
  assert.ok(list.some((m) => m.text === '记忆0'));
});

test('buildMemorySection 不再截断（需开启功能）', () => {
  setMemoriesEnabled(true);
  for (let i = 0; i < 100; i++) addMemory('很长的记忆内容' + i + '-' + 'y'.repeat(100));
  const s = buildMemorySection();
  assert.ok(!s.includes('更多记忆已省略'));
  assert.ok(s.length > 10000);
});

// ===== updateMemory（原地修改）=====

test('updateMemory 原地修改正文并保留 id/createdAt', () => {
  const a = addMemory('原始内容');
  const before = listMemories()[0];
  const r = updateMemory(a.id, '改后的内容');
  assert.ok(r);
  assert.strictEqual(r.id, a.id);
  assert.strictEqual(r.text, '改后的内容');
  assert.strictEqual(r.createdAt, before.createdAt);
  assert.ok(r.updatedAt >= before.updatedAt);
  assert.strictEqual(listMemories().length, 1);
});

test('updateMemory 记忆不存在返回 null', () => {
  assert.strictEqual(updateMemory('mem-not-exist', '内容'), null);
});

test('updateMemory 内容为空返回 null', () => {
  const a = addMemory('abc');
  assert.strictEqual(updateMemory(a.id, '   '), null);
});

test('updateMemory 改成与另一条相同则合并（删本条，返回已有那条）', () => {
  const a = addMemory('第一条');
  const b = addMemory('第二条');
  const r = updateMemory(b.id, '第一条');
  assert.strictEqual(r.id, a.id);
  assert.strictEqual(listMemories().length, 1);
});
