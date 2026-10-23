import fs from 'node:fs';
const NL = String.fromCharCode(10);
const dirs = [
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway',
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway'
];

for (const dir of dirs) {
  // 1. gateway.js: 返回明文
  const gp = dir + '/providers/gateway.js';
  let g = fs.readFileSync(gp, 'utf8');
  const oldGet = g.match(/\/api\/keys'[^{]+{([\s\S]*?)\n    }/);
  if (oldGet && g.includes('masked: masked')) {
    const newGet = g.replace(/\/api\/keys'[^{]+{([\s\S]*?)\n    }/, `    if (p === '/api/keys' && req.method === 'GET') {
      const list = keystore.loadKeys().map(function (k) {
        const plain = (typeof k.__plain === 'string' && k.__plain) || k.key;
        return { key: plain, note: k.note, createdAt: k.createdAt, enabled: k.enabled, calls: k.calls, lastUsedAt: k.lastUsedAt };
      });
      return json(res, 200, { success: true, keys: list });
    }`);
    fs.writeFileSync(gp, newGet, 'utf8');
    console.log('gateway.js: 恢复明文返回');
  }

  // 2. admin-html.js: 显示明文 + 恢复复制按钮 + copy 函数
  const hp = dir + '/lib/admin-html.js';
  let h = fs.readFileSync(hp, 'utf8');
  
  // 2a. 显示明文
  h = h.replace(/esc\(k\.masked \|\| \(k\.key \|\| ''\)\.slice\(0,\s*14\)\)/, 'esc(k.key)');

  // 2b. 恢复复制按钮（在停用按钮前面加）
  const oldBtn = "'<button class=\"btn ghost sm\" data-toggle=\"'+esc(k.key)+'\" data-en=\""+(k.enabled?'0':'1')+'\">'+(k.enabled?'停用':'启用')+'</button> ' +";
  if (h.includes(oldBtn) && !h.includes('data-copy-key')) {
    const indent = oldBtn.match(/^\s*/)[0];
    h = h.replace(oldBtn, indent + "'<button class=\"btn ghost sm\" data-copy-key=\"'+esc(k.key)+'\">复制</button> ' +\n" + indent + oldBtn);
  }

  // 2c. 恢复 copy 监听逻辑
  if (!h.includes('data-copy-key]\').forEach')) {
    const anchor = "area.querySelectorAll('[data-toggle]').forEach";
    if (h.includes(anchor)) {
      const indent = h.match(/\n(\s*)area\.querySelectorAll\('\[data-toggle\]'\)/)?.[1] || '  ';
      h = h.replace(anchor, indent + "area.querySelectorAll('[data-copy-key]').forEach(function(b){ b.onclick=function(){ copy(b.dataset.copyKey); }; });\n" + indent + anchor);
    }
  }

  // 2d. 确保有 copy 函数实现
  if (!h.includes('function copy(')) {
    const toastAnchor = 'function toast(';
    if (h.includes(toastAnchor)) {
      const indent = h.match(/\n(\s*)function toast\(/)?.[1] || '  ';
      h = h.replace(toastAnchor, indent + 'function copy(t){ try{navigator.clipboard.writeText(t); toast("已复制");}catch(e){toast("复制失败");} }\n' + indent + toastAnchor);
    }
  }

  fs.writeFileSync(hp, h, 'utf8');
  console.log('admin-html.js: 明文+复制按钮');
}