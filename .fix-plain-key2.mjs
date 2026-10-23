import fs from 'node:fs';
const NL = String.fromCharCode(10);
const dirs = [
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway',
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway'
];

for (const dir of dirs) {
  // 1. 修改 gateway.js
  const gp = dir + '/providers/gateway.js';
  let g = fs.readFileSync(gp, 'utf8');
  const oldG = [
    "    if (p === '/api/keys' && req.method === 'GET') {",
    '      const list = keystore.loadKeys().map(function (k) {',
    "        const plain = (typeof k.__plain === 'string' && k.__plain) || '';",
    "        const masked = plain ? (plain.slice(0, 14) + '…') : '(已加密)';",
    '        return { key: k.key, masked: masked, note: k.note, createdAt: k.createdAt, enabled: k.enabled, calls: k.calls, lastUsedAt: k.lastUsedAt };',
    '      });',
    '      return json(res, 200, { success: true, keys: list });',
    '    }'
  ].join(NL);
  const newG = [
    "    if (p === '/api/keys' && req.method === 'GET') {",
    '      const list = keystore.loadKeys().map(function (k) {',
    "        const plain = (typeof k.__plain === 'string' && k.__plain) || k.key;",
    '        return { key: plain, note: k.note, createdAt: k.createdAt, enabled: k.enabled, calls: k.calls, lastUsedAt: k.lastUsedAt };',
    '      });',
    '      return json(res, 200, { success: true, keys: list });',
    '    }'
  ].join(NL);
  if (g.includes(oldG)) {
    g = g.replace(oldG, newG);
    fs.writeFileSync(gp, g, 'utf8');
    console.log('✅ gateway.js 已改：返回明文 key');
  } else {
    console.log('⚠️ gateway.js 未匹配到旧块，尝试按行替换');
    const L = g.split(NL);
    for (let i = 0; i < L.length; i++) {
      if (L[i].includes('const masked = plain')) {
        L[i] = ''; // 删掉 masked 行
      } else if (L[i].includes('return { key: k.key, masked: masked')) {
        L[i] = L[i].replace('key: k.key, masked: masked', 'key: plain');
      }
    }
    fs.writeFileSync(gp, L.join(NL), 'utf8');
  }

  // 2. 修改 admin-html.js
  const hp = dir + '/lib/admin-html.js';
  let h = fs.readFileSync(hp, 'utf8');
  // 2a. 显示明文
  h = h.replace(/esc\(k\.masked \|\| \(k\.key \|\| ''\)\.slice\(0, 14\)\)/, 'esc(k.key)');
  // 2b. 在空行处补复制按钮
  const emptyBtnLine = /(\s*)'\+\s*\n/;
  // 找到包含 data-toggle 的行，在它上方插入复制按钮
  const lines = h.split(NL);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('data-toggle=') && lines[i].includes('btn ghost sm')) {
      if (!lines[i - 1].includes('data-copy-key')) {
        const indent = lines[i].match(/^\s*/)[0];
        const btnCode = indent + "'<button class=\"btn ghost sm\" data-copy-key=\"'+esc(k.key)+'\">复制</button> ' +";
        // 替换上面那行的空字符串 + 号
        if (lines[i - 1].trim() === "'' +") {
          lines[i - 1] = btnCode;
        } else {
          lines.splice(i, 0, btnCode);
        }
      }
      break;
    }
  }
  h = lines.join(NL);
  fs.writeFileSync(hp, h, 'utf8');
  console.log('✅ admin-html.js 已改：显示明文 + 复制按钮');
}