import fs from 'node:fs';
const NL = String.fromCharCode(10);
const p = 'C:/Users/Administrator/.cuckoo/plugins/ai-gateway/ui/gateway-panel.js';
const L = fs.readFileSync(p, 'utf8').split(NL);
console.log('=== 40-60 ===');
for (let i = 39; i < 60 && i < L.length; i++) console.log((i + 1) + ': ' + JSON.stringify(L[i]));
console.log('');
console.log('=== __gwPrank 附近 ===');
for (let i = 0; i < L.length; i++) {
  if (L[i].includes('__gwPrank') || L[i].includes('__gwNative')) console.log((i + 1) + ': ' + JSON.stringify(L[i]));
}
