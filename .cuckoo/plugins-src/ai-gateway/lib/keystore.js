/**
 * API Key 存储（JSON 文件）
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

function dataDir() {
  const home = process.env.CUCKOO_HOME || path.join(os.homedir(), '.cuckoo');
  return path.join(home, 'cuckoo-plugins-data', 'ai-gateway');
}
function keysFile() { return path.join(dataDir(), 'keys.json'); }
function ensureDir() { try { fs.mkdirSync(dataDir(), { recursive: true }); } catch (e) {} }

function loadKeys() {
  try { const arr = JSON.parse(fs.readFileSync(keysFile(), 'utf-8')); return Array.isArray(arr) ? arr : []; }
  catch (e) { return []; }
}
function saveKeys(list) { ensureDir(); fs.writeFileSync(keysFile(), JSON.stringify(list, null, 2), 'utf-8'); }
function genKey() { return 'sk-cuckoo-' + crypto.randomBytes(20).toString('hex'); }

function createKey(note) {
  const list = loadKeys();
  const k = { key: genKey(), note: note || '', createdAt: Date.now(), enabled: true, calls: 0, lastUsedAt: 0 };
  list.push(k); saveKeys(list); return k;
}
function deleteKey(key) {
  const list = loadKeys();
  const next = list.filter(function (k) { return k.key !== key; });
  const removed = next.length !== list.length;
  if (removed) saveKeys(next);
  return removed;
}
function setKeyEnabled(key, enabled) {
  const list = loadKeys();
  const k = list.find(function (x) { return x.key === key; });
  if (!k) return false;
  k.enabled = !!enabled; saveKeys(list); return true;
}
function validateKey(key) {
  if (!key) return null;
  const list = loadKeys();
  const k = list.find(function (x) { return x.key === key; });
  if (!k || !k.enabled) return null;
  return k;
}
function recordUse(key) {
  const list = loadKeys();
  const k = list.find(function (x) { return x.key === key; });
  if (!k) return;
  k.calls = (k.calls || 0) + 1; k.lastUsedAt = Date.now(); saveKeys(list);
}
module.exports = { loadKeys, createKey, deleteKey, setKeyEnabled, validateKey, recordUse, dataDir };
