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

function deriveCipherKey() {
  let secret = process.env.CUCKOO_HOME || '';
  try {
    const pw = path.join(dataDir(), 'admin-password.txt');
    if (fs.existsSync(pw)) secret = fs.readFileSync(pw, 'utf-8').trim() || secret;
  } catch (e) {}
  if (!secret) secret = os.hostname() + os.userInfo().username + 'cuckoo-gateway';
  return crypto.createHash('sha256').update(secret).digest();
}
function encryptStr(plain) {
  try {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', deriveCipherKey(), iv);
    const enc = Buffer.concat([c.update(String(plain), 'utf-8'), c.final()]);
    const tag = c.getAuthTag();
    return 'enc:' + Buffer.concat([iv, tag, enc]).toString('base64');
  } catch (e) { return plain; }
}
function decryptStr(stored) {
  if (typeof stored !== 'string' || stored.indexOf('enc:') !== 0) return stored;
  try {
    const buf = Buffer.from(stored.slice(4), 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const d = crypto.createDecipheriv('aes-256-gcm', deriveCipherKey(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(data), d.final()]).toString('utf-8');
  } catch (e) { return null; }
}
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
  const next = list.filter(function (k) { return (k.__plain || decryptStr(k.key)) !== key; });
  const removed = next.length !== list.length;
  if (removed) saveKeys(next);
  return removed;
}
function setKeyEnabled(key, enabled) {
  const list = loadKeys();
  const k = list.find(function (x) { return (x.__plain || decryptStr(x.key)) === key; });
  if (!k) return false;
  k.enabled = !!enabled; saveKeys(list); return true;
}
function validateKey(key) {
  if (!key) return null;
  const list = loadKeys();
  const k = list.find(function (x) { return (x.__plain || decryptStr(x.key)) === key; });
  if (!k || !k.enabled) return null;
  return k;
}
function recordUse(key) {
  const list = loadKeys();
  const k = list.find(function (x) { return (x.__plain || decryptStr(x.key)) === key; });
  if (!k) return;
  k.calls = (k.calls || 0) + 1; k.lastUsedAt = Date.now(); saveKeys(list);
}
module.exports = { loadKeys, createKey, deleteKey, setKeyEnabled, validateKey, recordUse, dataDir };
