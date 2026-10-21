import fs from 'node:fs';
const files = [
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/lib/keystore.js',
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway/lib/keystore.js',
];
for (const p of files) {
  if (!fs.existsSync(p)) { console.log('SKIP ' + p); continue; }
  let s = fs.readFileSync(p, 'utf8');
  let n = 0;
  // validateKey / recordUse 里的明文比对 → 用 __plain
  const old1 = "  const k = list.find(function (x) { return x.key === key; });";
  while (s.includes(old1)) {
    s = s.replace(old1, "  const k = list.find(function (x) { return (x.__plain || decryptStr(x.key)) === key; });");
    n++;
  }
  fs.writeFileSync(p, s, 'utf8');
  console.log(p.split('/').slice(-3).join('/') + ': 修 ' + n + ' 处');
}
