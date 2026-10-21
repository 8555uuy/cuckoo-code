import fs from 'node:fs';
const NL = String.fromCharCode(10);
const dirs = [
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway',
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway',
];

for (const dir of dirs) {
  // 1. gateway.js: /api/keys 返回 masked
  const gp = dir + '/providers/gateway.js';
  let g = fs.readFileSync(gp, 'utf8');
  const oldGet = "    if (p === '/api/keys' && req.method === 'GET') return json(res, 200, { success: true, keys: keystore.loadKeys() });";
  if (g.includes(oldGet)) {
    const neu = [
      "    if (p === '/api/keys' && req.method === 'GET') {",
      '      const list = keystore.loadKeys().map(function (k) {',
      "        const plain = (typeof k.__plain === 'string' && k.__plain) || '';",
      "        const masked = plain ? (plain.slice(0, 14) + '…') : '(已加密)';",
      '        return { key: k.key, masked: masked, note: k.note, createdAt: k.createdAt, enabled: k.enabled, calls: k.calls, lastUsedAt: k.lastUsedAt };',
      '      });',
      '      return json(res, 200, { success: true, keys: list });',
      '    }',
    ].join(NL);
    g = g.replace(oldGet, neu);
    fs.writeFileSync(gp, g, 'utf8');
    console.log('gateway /api/keys 已脱敏: ' + dir.split('/').pop());
  }

  // 2. admin-html.js: 删孤儿复制处理器
  const hp = dir + '/lib/admin-html.js';
  let h = fs.readFileSync(hp, 'utf8');
  const copyHandler = "  area.querySelectorAll('[data-copy-key]').forEach(function(b){ b.onclick=function(){ copy(b.dataset.copyKey); }; });";
  if (h.includes(copyHandler)) {
    h = h.replace(copyHandler, '');
    fs.writeFileSync(hp, h, 'utf8');
    console.log('admin 复制处理器已删: ' + dir.split('/').pop());
  }
}
console.log('done');
