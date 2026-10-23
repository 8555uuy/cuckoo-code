import fs from 'node:fs';
const NL = String.fromCharCode(10);
const p = 'D:/cuckoo-code/src/bridge/subagent.ts';
const L = fs.readFileSync(p, 'utf8').split(NL);

let interceptIdx = -1;
let blocksIdx = -1;

for (let i = 0; i < L.length; i++) {
  if (L[i].includes('if (cfg.interceptTools && blocks.length > 0)')) interceptIdx = i;
  if (L[i].includes('const blocks = extractJsToolBlocks(raw);')) blocksIdx = i;
}

console.log('interceptIdx=' + interceptIdx + ', blocksIdx=' + blocksIdx);

if (interceptIdx >= 0 && blocksIdx >= 0 && interceptIdx < blocksIdx) {
  // 1. 删除原定义行
  L.splice(blocksIdx, 1);
  // 2. 在 intercept 前插入定义
  const indent = L[interceptIdx].match(/^\s*/)[0];
  L.splice(interceptIdx, 0, indent + 'const blocks = extractJsToolBlocks(raw);');
  fs.writeFileSync(p, L.join(NL), 'utf8');
  console.log('✅ 修复了 blocks 的作用域顺序');
} else {
  console.log('⚠️ 顺序已是正确的，或者未找到锚点');
}