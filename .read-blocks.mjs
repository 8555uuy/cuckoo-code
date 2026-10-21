import fs from 'node:fs';
const NL = String.fromCharCode(10);

// 1. project-context.ts
const p1 = 'D:/cuckoo-code/src/session/project-context.ts';
const L1 = fs.readFileSync(p1, 'utf8').split(NL);
console.log('=== project-context.ts 160-182 ===');
for (let i = 159; i < 182 && i < L1.length; i++) {
  console.log((i + 1) + ': ' + JSON.stringify(L1[i]));
}

// 2. bridge/subagent.ts
const p2 = 'D:/cuckoo-code/src/bridge/subagent.ts';
const L2 = fs.readFileSync(p2, 'utf8').split(NL);
console.log('');
console.log('=== bridge/subagent.ts 90-100 ===');
for (let i = 89; i < 100 && i < L2.length; i++) {
  console.log((i + 1) + ': ' + JSON.stringify(L2[i]));
}
