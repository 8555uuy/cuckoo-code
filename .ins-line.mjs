import fs from 'node:fs';
const NL = String.fromCharCode(10);
const dirs = [
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway',
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway',
];
for (const dir of dirs) {
  const p = dir + '/providers/gateway.js';
  const L = fs.readFileSync(p, 'utf8').split(NL);
  let done = false;
  for (let i = 0; i < L.length; i++) {
    // 找流式 run 里的 parentWindowId 行（紧随其后是 onChunk）
    if (L[i] && L[i].trim() === 'parentWindowId: parentWindowId,' && L[i + 1] && L[i + 1].includes('onChunk: function')) {
      // 检查是否已插入
      if (!L[i + 1].includes('noCuckooPrompt') && !L[i].includes('noCuckooPrompt')) {
        const indent = L[i].match(/^\s*/)[0];
        L.splice(i + 1, 0, indent + 'noCuckooPrompt: cfg.nativeMode === true,');
        done = true;
      }
      break;
    }
  }
  fs.writeFileSync(p, L.join(NL), 'utf8');
  console.log(dir.split('/').pop() + ': ' + (done ? 'OK' : 'MISS/已存在'));
}
