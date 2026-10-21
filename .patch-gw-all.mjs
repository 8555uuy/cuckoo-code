import fs from 'node:fs';
import path from 'node:path';

const DIRS = [
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway',
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway',
];
const NL = String.fromCharCode(10);

function patchFile(p, fn) {
  if (!fs.existsSync(p)) { console.log('SKIP ' + p); return; }
  let s = fs.readFileSync(p, 'utf8');
  const r = fn(s);
  if (r !== s) { fs.writeFileSync(p, r, 'utf8'); console.log('PATCHED ' + p.split('/').slice(-3).join('/')); }
  else console.log('unchanged ' + p.split('/').slice(-3).join('/'));
}

for (const dir of DIRS) {
  // ========== 1. gateway.js: host + 随机密码 + CORS ==========
  patchFile(path.join(dir, 'providers/gateway.js'), (s) => {
    // 1a. 默认值
    s = s.replace(
      "const out = { port: 18900, host: '0.0.0.0', adminPassword: 'admin', requireKey: true, autoStart: true, enabled: true };",
      "const out = { port: 18900, host: '127.0.0.1', adminPassword: '', requireKey: true, autoStart: true, enabled: true };"
    );
    // 1b. 随机密码：在 catch(e){} 和 return out 之间插入
    if (!s.includes('admin-password.txt')) {
      s = s.replace(
        '  } catch (e) {}' + NL + '  return out;',
        '  } catch (e) {}' + NL +
        '  // 未设置密码时生成随机强密码并落盘（仅本机可读）' + NL +
        '  if (!out.adminPassword) {' + NL +
        '    try {' + NL +
        "      const pwFile = path.join(dataDir(), 'admin-password.txt');" + NL +
        '      if (fs.existsSync(pwFile)) {' + NL +
        "        const t = fs.readFileSync(pwFile, 'utf-8').trim();" + NL +
        '        if (t.length >= 8) out.adminPassword = t;' + NL +
        '      }' + NL +
        '      if (!out.adminPassword) {' + NL +
        "        out.adminPassword = crypto.randomBytes(9).toString('base64url');" + NL +
        '        fs.mkdirSync(path.dirname(pwFile), { recursive: true });' + NL +
        "        fs.writeFileSync(pwFile, out.adminPassword + NL, { mode: 0o600 });" + NL +
        "        console.log('[ai-gateway] 已生成管理密码（保存在 ' + pwFile + '）');" + NL +
        '      }' + NL +
        '    } catch (e) { out.adminPassword = String(Date.now()); }' + NL +
        '  }' + NL +
        '  return out;'
      );
    }
    // 1c. CORS
    s = s.split("'Access-Control-Allow-Origin': '*'").join("'Access-Control-Allow-Origin': (res.req && res.req.headers && res.req.headers.origin) || 'http://127.0.0.1'");
    s = s.split("res.setHeader('Access-Control-Allow-Origin', '*');").join("res.setHeader('Access-Control-Allow-Origin', (req.headers.origin || 'http://127.0.0.1'));");
    return s;
  });

  // ========== 2. keystore.js: AES 加密 ==========
  patchFile(path.join(dir, 'lib/keystore.js'), (s) => {
    if (s.includes('encryptStr')) return s; // 已加密
    // 2a. 加加密辅助
    s = s.replace(
      "function keysFile() { return path.join(dataDir(), 'keys.json'); }",
      "function keysFile() { return path.join(dataDir(), 'keys.json'); }" + NL + NL +
      'function deriveCipherKey() {' + NL +
      "  let secret = process.env.CUCKOO_HOME || '';" + NL +
      '  try {' + NL +
      "    const pw = path.join(dataDir(), 'admin-password.txt');" + NL +
      "    if (fs.existsSync(pw)) secret = fs.readFileSync(pw, 'utf-8').trim() || secret;" + NL +
      '  } catch (e) {}' + NL +
      "  if (!secret) secret = os.hostname() + os.userInfo().username + 'cuckoo-gateway';" + NL +
      "  return crypto.createHash('sha256').update(secret).digest();" + NL +
      '}' + NL +
      'function encryptStr(plain) {' + NL +
      '  try {' + NL +
      '    const iv = crypto.randomBytes(12);' + NL +
      "    const c = crypto.createCipheriv('aes-256-gcm', deriveCipherKey(), iv);" + NL +
      "    const enc = Buffer.concat([c.update(String(plain), 'utf-8'), c.final()]);" + NL +
      '    const tag = c.getAuthTag();' + NL +
      "    return 'enc:' + Buffer.concat([iv, tag, enc]).toString('base64');" + NL +
      '  } catch (e) { return plain; }' + NL +
      '}' + NL +
      'function decryptStr(stored) {' + NL +
      "  if (typeof stored !== 'string' || stored.indexOf('enc:') !== 0) return stored;" + NL +
      '  try {' + NL +
      "    const buf = Buffer.from(stored.slice(4), 'base64');" + NL +
      '    const iv = buf.subarray(0, 12);' + NL +
      '    const tag = buf.subarray(12, 28);' + NL +
      '    const data = buf.subarray(28);' + NL +
      "    const d = crypto.createDecipheriv('aes-256-gcm', deriveCipherKey(), iv);" + NL +
      '    d.setAuthTag(tag);' + NL +
      "    return Buffer.concat([d.update(data), d.final()]).toString('utf-8');" + NL +
      '  } catch (e) { return null; }' + NL +
      '}'
    );
    // 2b. loadKeys：解密 + 迁移
    s = s.replace(
      'function loadKeys() {' + NL +
      "  try { const arr = JSON.parse(fs.readFileSync(keysFile(), 'utf-8')); return Array.isArray(arr) ? arr : []; }" + NL +
      '  catch (e) { return []; }' + NL +
      '}',
      'function loadKeys() {' + NL +
      '  try {' + NL +
      "    const raw = fs.readFileSync(keysFile(), 'utf-8');" + NL +
      '    const arr = JSON.parse(raw);' + NL +
      '    if (!Array.isArray(arr)) return [];' + NL +
      '    let migrated = false;' + NL +
      '    for (const k of arr) {' + NL +
      "      if (k && typeof k.key === 'string' && k.key.indexOf('enc:') !== 0) {" + NL +
      '        k.key = encryptStr(k.key);' + NL +
      '        migrated = true;' + NL +
      '      }' + NL +
      '    }' + NL +
      '    for (const k of arr) {' + NL +
      "      if (k && typeof k.key === 'string') {" + NL +
      "        Object.defineProperty(k, '__plain', { value: decryptStr(k.key), enumerable: false, writable: true });" + NL +
      '      }' + NL +
      '    }' + NL +
      '    if (migrated) { try { saveKeys(arr); } catch (e) {} }' + NL +
      '    return arr;' + NL +
      '  } catch (e) { return []; }' + NL +
      '}'
    );
    // 2c. createKey 加密
    s = s.replace(
      "  const k = { key: genKey(), note: note || '', createdAt: Date.now(), enabled: true, calls: 0, lastUsedAt: 0 };" + NL +
      '  list.push(k); saveKeys(list); return k;',
      '  const plain = genKey();' + NL +
      "  const k = { key: encryptStr(plain), note: note || '', createdAt: Date.now(), enabled: true, calls: 0, lastUsedAt: 0 };" + NL +
      '  list.push(k); saveKeys(list);' + NL +
      '  return { key: plain, note: k.note, createdAt: k.createdAt, enabled: k.enabled, calls: 0, lastUsedAt: 0 };'
    );
    // 2d. 比对统一用 __plain
    s = s.replace(/const k = list\.find\(function \(x\) \{ return x\.key === key; \}\);/g,
      "const k = list.find(function (x) { return (x.__plain || decryptStr(x.key)) === key; });");
    s = s.replace(/const next = list\.filter\(function \(k\) \{ return k\.key !== key; \}\);/g,
      "const next = list.filter(function (k) { return (k.__plain || decryptStr(k.key)) !== key; });");
    return s;
  });

  // ========== 3. admin-html.js: 脱敏 ==========
  patchFile(path.join(dir, 'lib/admin-html.js'), (s) => {
    // 3a. 显示 masked
    s = s.replace("esc(k.key.slice(0,14))+'…'", "esc(k.masked || (k.key || '').slice(0,14))");
    // 3b. 删复制按钮（明文只有创建时出现一次）
    s = s.replace(/<button class="btn ghost sm" data-copy-key="'\+esc\(k\.key\)\+'">复制<\/button> /g, '');
    return s;
  });
}
console.log('all done');
