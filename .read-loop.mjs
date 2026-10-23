import fs from 'node:fs';
const p = 'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/lib/openai-api.js';
const L = fs.readFileSync(p, 'utf8').split(String.fromCharCode(10));
for (let i = 5; i < 25 && i < L.length; i++) {
  console.log((i + 1) + ': ' + JSON.stringify(L[i]));
}