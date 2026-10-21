import fs from 'node:fs';
const p = 'D:/cuckoo-code/test/infra/memories.test.js';
let s = fs.readFileSync(p, 'utf8');
const oldLine = "const { listMemories, saveMemories, addMemory, removeMemory, buildMemorySection } = await import('../../src/infra/memories.js');";
const newLine = "const { listMemories, saveMemories, addMemory, removeMemory, updateMemory, buildMemorySection } = await import('../../src/infra/memories.js');";
if (s.includes(oldLine)) {
  s = s.replace(oldLine, newLine);
  fs.writeFileSync(p, s, 'utf8');
  console.log('✅ 已补 updateMemory 到 import');
} else {
  console.log('❌ 未找到 import 行');
}
