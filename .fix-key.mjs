import fs from 'node:fs';
const targets = [
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/lib/keystore.js',
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway/lib/keystore.js',
];
const NL = String.fromCharCode(10);

for (const p of targets) {
  let s = fs.readFileSync(p, 'utf8');

  // 1. 加加密/解密辅助（用 admin-password 派生密钥，没有则用机器唯一标识）
  const anchor = "function keysFile() { return path.join(dataDir(), 'keys.json'); }";
  if (!s.includes('function encryptStr')) {
    const helper = [
      "function keysFile() { return path.join(dataDir(), 'keys.json'); }",
      '',
      '/** 从管理密码文件派生 AES 密钥（仅本机可读；文件权限 0600） */',
      'function deriveCipherKey() {',
      '  let secret = process.env.CUCKOO_HOME || \'\';',
      '  try {',
      "    const pw = path.join(dataDir(), 'admin-password.txt');",
      "    if (fs.existsSync(pw)) secret = fs.readFileSync(pw, 'utf-8').trim() || secret;",
      '  } catch (e) { /* ignore */ }',
      "  if (!secret) secret = os.hostname() + os.userInfo().username + 'cuckoo-gateway';",
      "  return crypto.createHash('sha256').update(secret).digest();",
      '}',
      '',
      '/** 加密后的 key 以 enc: 前缀标记，历史明文 key 仍兼容（读取时识别） */',
      'function encryptStr(plain) {',
      '  try {',
      "    const iv = crypto.randomBytes(12);",
      "    const c = crypto.createCipheriv('aes-256-gcm', deriveCipherKey(), iv);",
      "    const enc = Buffer.concat([c.update(String(plain), 'utf-8'), c.final()]);",
      "    const tag = c.getAuthTag();",
      "    return 'enc:' + Buffer.concat([iv, tag, enc]).toString('base64');",
      '  } catch (e) { return plain; }',
      '}',
      'function decryptStr(stored) {',
      "  if (typeof stored !== 'string' || stored.indexOf('enc:') !== 0) return stored;",
      '  try {',
      "    const buf = Buffer.from(stored.slice(4), 'base64');",
      '    const iv = buf.subarray(0, 12);',
      '    const tag = buf.subarray(12, 28);',
      '    const data = buf.subarray(28);',
      "    const d = crypto.createDecipheriv('aes-256-gcm', deriveCipherKey(), iv);",
      '    d.setAuthTag(tag);',
      "    return Buffer.concat([d.update(data), d.final()]).toString('utf-8');",
      '  } catch (e) { return null; }',
      '}',
    ].join(NL);
    s = s.replace(anchor, helper);
  }

  // 2. loadKeys：解密 + 明文自动迁移为密文
  const oldLoad = [
    'function loadKeys() {',
    "  try { const arr = JSON.parse(fs.readFileSync(keysFile(), 'utf-8')); return Array.isArray(arr) ? arr : []; }",
    '  catch (e) { return []; }',
    '}',
  ].join(NL);
  const newLoad = [
    'function loadKeys() {',
    '  try {',
    "    const raw = fs.readFileSync(keysFile(), 'utf-8');",
    '    const arr = JSON.parse(raw);',
    '    if (!Array.isArray(arr)) return [];',
    '    let migrated = false;',
    '    for (const k of arr) {',
    "      if (k && typeof k.key === 'string' && k.key.indexOf('enc:') !== 0) {",
    '        // 历史明文 → 立即迁移为密文',
    '        const real = k.key;',
    '        k.key = encryptStr(real);',
    '        migrated = true;',
    '      }',
    '    }',
    '    // 兼容：把真实 key 附到内存对象上（不落盘），供 validateKey 比对',
    '    for (const k of arr) {',
    '      if (k && typeof k.key === \'string\') {',
    "        Object.defineProperty(k, '__plain', { value: decryptStr(k.key), enumerable: false, writable: true });",
    '      }',
    '    }',
    '    if (migrated) { try { saveKeys(arr); } catch (e) {} }',
    '    return arr;',
    '  } catch (e) { return []; }',
    '}',
  ].join(NL);
  if (s.includes(oldLoad)) {
    s = s.replace(oldLoad, newLoad);
  }

  // 3. saveKeys：过滤掉 __plain（不可枚举已排除）
  // 4. validateKey：用 __plain 比对
  s = s.replace(
    "  const k = list.find(function (x) { return x.key === key; });",
    "  const k = list.find(function (x) { return (x.__plain || decryptStr(x.key)) === key; });"
  );

  // 5. deleteKey / setKeyEnabled / recordUse 同样用 __plain 比对
  s = s.replace(
    "  const next = list.filter(function (k) { return k.key !== key; });",
    "  const next = list.filter(function (k) { return (k.__plain || decryptStr(k.key)) !== key; });"
  );

  // 6. createKey 生成时加密
  s = s.replace(
    "  const k = { key: genKey(), note: note || '', createdAt: Date.now(), enabled: true, calls: 0, lastUsedAt: 0 };",
    "  const plain = genKey();" + NL + "  const k = { key: encryptStr(plain), note: note || '', createdAt: Date.now(), enabled: true, calls: 0, lastUsedAt: 0 };" + NL + "  // 返回值带明文（仅创建时给一次），列表接口只返回脱敏 key" + NL + "  Object.defineProperty(k, '__plain', { value: plain, enumerable: false, writable: true });"
  );
  s = s.replace(
    '  list.push(k); saveKeys(list); return k;',
    '  list.push(k); saveKeys(list); return { key: plain, note: k.note, createdAt: k.createdAt, enabled: k.enabled, calls: 0, lastUsedAt: 0 };'
  );

  fs.writeFileSync(p, s, 'utf8');
  console.log('OK ' + p.split('/').slice(-3).join('/'));
}
