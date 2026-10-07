'use strict';
import { test } from 'vitest';
import assert from 'node:assert';

// 与 observer.ts 保持一致的正则（行首锚定）
const MEMORY_MARKER_RE = /^[ \t]*[\[【]记忆[\]】]\s*([^\n]+)/gm;
const SNAPSHOT_MARKER_RE = /^[ \t]*[\[【]快照[\]】]\s*([^\n]+)/gm;

function extract(re, text) {
  return Array.from(text.matchAll(re)).map((m) => (m[1] || '').trim()).filter(Boolean);
}

// ===== 记忆标记 =====
test('提取 [记忆] 半角（行首）', () => {
  assert.deepStrictEqual(extract(MEMORY_MARKER_RE, '[记忆]用户偏好中文'), ['用户偏好中文']);
});
test('提取 【记忆】 全角', () => {
  assert.deepStrictEqual(extract(MEMORY_MARKER_RE, '【记忆】喜欢简洁'), ['喜欢简洁']);
});
test('多条记忆', () => {
  assert.deepStrictEqual(extract(MEMORY_MARKER_RE, '[记忆]A\n[记忆]B'), ['A', 'B']);
});
test('记忆标记不跨行', () => {
  assert.deepStrictEqual(extract(MEMORY_MARKER_RE, '[记忆]第一行\n第二行'), ['第一行']);
});
test('记忆标记在行中（非行首）不识别', () => {
  assert.deepStrictEqual(extract(MEMORY_MARKER_RE, '好的。[记忆]用户偏好中文'), []);
});
test('记忆标记行首有前导空白仍识别', () => {
  assert.deepStrictEqual(extract(MEMORY_MARKER_RE, '   [记忆]缩进也可以'), ['缩进也可以']);
});

// ===== 快照标记 =====
test('提取 [快照] 半角（行首）', () => {
  assert.deepStrictEqual(extract(SNAPSHOT_MARKER_RE, '[快照]重构前'), ['重构前']);
});
test('提取 【快照】 全角', () => {
  assert.deepStrictEqual(extract(SNAPSHOT_MARKER_RE, '【快照】改前'), ['改前']);
});
test('多条快照', () => {
  assert.deepStrictEqual(extract(SNAPSHOT_MARKER_RE, '[快照]A\n[快照]B'), ['A', 'B']);
});
test('快照标记不跨行', () => {
  assert.deepStrictEqual(extract(SNAPSHOT_MARKER_RE, '[快照]第一行\n第二行'), ['第一行']);
});
test('快照标记在行中（非行首）不识别', () => {
  assert.deepStrictEqual(extract(SNAPSHOT_MARKER_RE, '先存个档 [快照]重构前'), []);
});

test('无标记返回空', () => {
  assert.deepStrictEqual(extract(MEMORY_MARKER_RE, '普通回复没有标记'), []);
  assert.deepStrictEqual(extract(SNAPSHOT_MARKER_RE, '普通回复没有标记'), []);
});
