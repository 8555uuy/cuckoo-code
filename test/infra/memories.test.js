'use strict';
import { test, beforeEach } from 'vitest';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 用 CUCKOO_HOME 隔离
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cuckoo-mem-'));
process.env.CUCKOO_HOME = TMP;

const { listMemories, saveMemories, addMemory, removeMemory, buildMemorySection } = await import('../../src/infra/memories.js');

beforeEach(() => { try { fs.rmSync(path.join(TMP, 'memories.json'), { force: true }); } catch {} });

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
  assert.strictEqual(buildMemorySection(), '');
});

test('buildMemorySection 有记忆返回章节', () => {
  addMemory('习惯1');
  addMemory('习惯2');
  const s = buildMemorySection();
  assert.ok(s.includes('## 用户记忆'));
  assert.ok(s.includes('习惯1'));
  assert.ok(s.includes('习惯2'));
});
