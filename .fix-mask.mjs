import fs from 'node:fs';
const NL = String.fromCharCode(10);

const gws = [
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/providers/gateway.js',
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway/providers/gateway.js',
];
for (const p of gws) {
  let s = fs.readFileSync(p, 'utf8');
  const old = "    if (p === '/api/keys' && req.method === 'GET') return json(res, 200, { success: true, keys: keystore.loadKeys() });";
  if (s.includes(old)) {
    const neu = [
      "    if (p === '/api/keys' && req.method === 'GET') {",
      '      // 列表只返回脱敏前缀；操作标识用密文 key（与存储一致）',
      '      const list = keystore.loadKeys().map(function (k) {',
      "        const plain = (typeof k.__plain === 'string' && k.__plain) || '';",
      "        const masked = plain ? (plain.slice(0, 14) + '…') : '(已加密)';",
      '        return { key: k.key, masked: masked, note: k.note, createdAt: k.createdAt, enabled: k.enabled, calls: k.calls, lastUsedAt: k.lastUsedAt };',
      '      });',
      '      return json(res, 200, { success: true, keys: list });',
      '    }',
    ].join(NL);
    s = s.replace(old, neu);
    fs.writeFileSync(p, s, 'utf8');
    console.log('OK gateway ' + p.split('/').slice(-3).join('/'));
  } else {
    console.log('MISS gateway');
  }
}

const htmls = [
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/lib/admin-html.js',
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway/lib/admin-html.js',
];
for (const p of htmls) {
  let s = fs.readFileSync(p, 'utf8');
  const old = "esc(k.key.slice(0,14))+'…'";
  if (s.includes(old)) {
    s = s.replace(old, "esc(k.masked || (k.key || '').slice(0,14))");
    fs.writeFileSync(p, s, 'utf8');
    console.log('OK admin ' + p.split('/').slice(-3).join('/'));
  } else {
    console.log('MISS admin');
  }
}
