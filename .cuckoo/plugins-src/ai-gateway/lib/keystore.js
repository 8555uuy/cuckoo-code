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

/** 从管理密码文件派生 AES 密钥（仅本机可读；文件权限 0600） */
function deriveCipherKey() {
  let secret = process.env.CUCKOO_HOME || '';
  try {
    const pw = path.join(dataDir(), 'admin-password.txt');
    if (fs.existsSync(pw)) secret = fs.readFileSync(pw, 'utf-8').trim() || secret;
  } catch (e) { /* ignore */ }
  if (!secret) secret = os.hostname() + os.userInfo().username + 'cuckoo-gateway';
  return crypto.createHash('sha256').update(secret).digest();
}

/** 加密后的 key 以 enc: 前缀标记，历史明文 key 仍兼容（读取时识别） */
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
  try {
    const raw = fs.readFileSync(keysFile(), 'utf-8');
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    let migrated = false;
    for (const k of arr) {
      if (k && typeof k.key === 'string' && k.key.indexOf('enc:') !== 0) {
        // 历史明文 → 立即迁移为密文
        const real = k.key;
        k.key = encryptStr(real);
        migrated = true;
      }
    }
    // 兼容：把真实 key 附到内存对象上（不落盘），供 validateKey 比对
    for (const k of arr) {
      if (k && typeof k.key === 'string') {
        Object.defineProperty(k, '__plain', { value: decryptStr(k.key), enumerable: false, writable: true });
      }
    }
    if (migrated) { try { saveKeys(arr); } catch (e) {} }
    return arr;
  } catch (e) { return []; }
}
function saveKeys(list) { ensureDir(); fs.writeFileSync(keysFile(), JSON.stringify(list, null, 2), 'utf-8'); }
function genKey() { return 'sk-cuckoo-' + crypto.randomBytes(20).toString('hex'); }

function createKey(note) {
  const list = loadKeys();
  const plain = genKey();
  const k = { key: encryptStr(plain), note: note || '', createdAt: Date.now(), enabled: true, calls: 0, lastUsedAt: 0 };
  // 返回值带明文（仅创建时给一次），列表接口只返回脱敏 key
  Object.defineProperty(k, '__plain', { value: plain, enumerable: false, writable: true });
  list.push(k); saveKeys(list); return { key: plain, note: k.note, createdAt: k.createdAt, enabled: k.enabled, calls: 0, lastUsedAt: 0 };
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
