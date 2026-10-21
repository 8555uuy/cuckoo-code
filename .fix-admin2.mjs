import fs from 'node:fs';
const files = [
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway/lib/admin-html.js',
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/lib/admin-html.js',
];
const NL = String.fromCharCode(10);

for (const p of files) {
  const L = fs.readFileSync(p, 'utf8').split(NL);
  let fixed = [];
  for (let i = 0; i < L.length; i++) {
    // 1. 显示行：用 masked
    if (L[i].includes('k.key.slice(0,14)')) {
      L[i] = L[i].replace(/esc\(k\.key\.slice\(0,\s*14\)\)\s*\+\s*'[^']*'/, "esc(k.masked || (k.key || '').slice(0, 14))");
      fixed.push('显示' + (i + 1));
    }
    // 2. 复制按钮行：整行清空
    if (L[i].includes('data-copy-key="') && L[i].includes('复制')) {
      L[i] = '';
      fixed.push('复制按钮' + (i + 1));
    }
  }
  fs.writeFileSync(p, L.join(NL), 'utf8');
  console.log(p.split('/').slice(-3).join('/') + ': ' + fixed.join(', '));
}
