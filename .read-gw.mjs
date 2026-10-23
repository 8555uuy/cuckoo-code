import fs from 'node:fs';
const p = 'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/providers/gateway.js';
const L = fs.readFileSync(p, 'utf8').split(String.fromCharCode(10));
let start = -1, end = -1;
for (let i = 0; i < L.length; i++) {
  if (L[i] && L[i].includes('if (stream) {')) { start = i; break; }
}
if (start >= 0) {
  for (let i = start + 1; i < L.length; i++) {
    if (L[i] && L[i].includes('// 非流式')) { end = i; break; }
  }
}
console.log('start=' + (start+1) + ' end=' + (end+1));
if (start >= 0 && end > start) {
  for (let i = start; i <= end; i++) {
    console.log((i+1) + ': ' + JSON.stringify(L[i]));
  }
}