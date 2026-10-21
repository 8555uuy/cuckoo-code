import fs from 'node:fs';
const NL = String.fromCharCode(10);

const files = [
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/lib/admin-html.js',
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway/lib/admin-html.js',
];

for (const p of files) {
  const L = fs.readFileSync(p, 'utf8').split(NL);
  let changed = [];

  for (let i = 0; i < L.length; i++) {
    // 1. 显示密文前缀 → 用 masked 字段
    if (L[i].includes('k.key.slice(0,14)')) {
      L[i] = L[i].replace("esc(k.key.slice(0,14))+'…'", "esc(k.masked || '')");
      // 兜底：若是其它引号形式
      L[i] = L[i].replace(/esc\(k\.key\.slice\(0,14\)\)\+'[^']*'/, "esc(k.masked || '')");
      changed.push('显示行' + (i + 1));
    }
    // 2. 移除「复制」按钮（明文只在创建时出现一次，列表里没有明文可复制）
    if (L[i].includes('data-copy-key=')) {
      L[i] = L[i].replace(/<button class="btn ghost sm" data-copy-key="'\+esc\(k\.key\)\+'">复制<\/button> /, '');
      changed.push('复制按钮行' + (i + 1));
    }
  }

  fs.writeFileSync(p, L.join(NL), 'utf8');
  console.log(p.split('/').slice(-2).join('/') + ': ' + (changed.length ? changed.join(', ') : '无改动'));
}
