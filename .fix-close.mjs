import fs from 'node:fs';
const NL = String.fromCharCode(10);
const files = [
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/lib/admin-html.js',
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway/lib/admin-html.js',
];
for (const p of files) {
  const L = fs.readFileSync(p, 'utf8').split(NL);
  let fixed = 0;
  for (let i = 0; i < L.length; i++) {
    if (L[i].includes("esc(k.masked || '')") && !L[i].includes('</code>')) {
      // 补回闭合
      L[i] = L[i].replace(/\+\s*$/, '') + " +'</code></td>' +";
      fixed++;
    }
    if (L[i].trim() === "'' +") { L[i] = ''; fixed++; }
  }
  fs.writeFileSync(p, L.join(NL), 'utf8');
  console.log(p.split('/').slice(-2).join('/') + ': 修 ' + fixed + ' 处');
}
