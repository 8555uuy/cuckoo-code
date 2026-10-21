import fs from 'node:fs';
const p = 'D:/cuckoo-code/src/infra/memories.ts';
const L = fs.readFileSync(p, 'utf8').split(String.fromCharCode(10));

// 打印 85-175 带行号，找精确位置
for (let i = 84; i < 175 && i < L.length; i++) {
  console.log((i + 1) + ': ' + JSON.stringify(L[i]));
}
