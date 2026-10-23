import fs from 'node:fs';
const NL = String.fromCharCode(10);
const dirs = [
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/providers/gateway.js',
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway/providers/gateway.js'
];

for (const p of dirs) {
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('const text = messagesToText(messages);')) {
    s = s.replace('const text = messagesToText(messages);', 'let text = messagesToText(messages);');
    fs.writeFileSync(p, s, 'utf8');
    console.log('✅ 修复 ' + p + ' 的 text 声明');
  }
}