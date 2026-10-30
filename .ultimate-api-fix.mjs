import fs from 'node:fs';
const NL = String.fromCharCode(10);

// 1. 修复 shared.ts，用 Object.assign 把我们需要的 API 强行绑上去，完全绕过 TS 类型检查
const pShared = 'D:/cuckoo-code/src/ui/shell/scripts/shared.ts';
let shared = fs.readFileSync(pShared, 'utf8');
if (!shared.includes('listMemories')) {
  const code = [
    '',
    '// 补充记忆与快照 API 到全局 api 对象',
    'const extraApis = {',
    '  listMemories: () => (window as any).shellAPI.listMemories(),',
    '  addMemory: (text: string) => (window as any).shellAPI.addMemory(text),',
    '  updateMemory: (id: string, text: string) => (window as any).shellAPI.updateMemory(id, text),',
    '  deleteMemory: (id: string) => (window as any).shellAPI.deleteMemory(id),',
    '  listSnapshots: () => (window as any).shellAPI.listSnapshots(),',
    '  createSnapshot: (name: string) => (window as any).shellAPI.createSnapshot(name),',
    '  restoreSnapshot: (id: string) => (window as any).shellAPI.restoreSnapshot(id),',
    '};',
    'Object.assign(api as any, extraApis);',
  ].join(NL);
  shared += NL + code;
  fs.writeFileSync(pShared, shared, 'utf8');
  console.log('✅ shared.ts 已补充额外 API');
}

// 2. 确保 main.ts 里绝对没有旧版的注册残留
const pMain = 'D:/cuckoo-code/src/ui/shell/scripts/main.ts';
let main = fs.readFileSync(pMain, 'utf8');
main = main.replace(/registerPage\('memories',\s*MemoriesPage.*?\);/g, '');
main = main.replace(/registerPage\('snapshots',\s*SnapshotsPage.*?\);/g, '');
main = main.replace(/import \{ loadMemories as MemoriesPage \}.*?\n/g, '');
main = main.replace(/import \{ loadSnapshots as SnapshotsPage \}.*?\n/g, '');
fs.writeFileSync(pMain, main, 'utf8');
console.log('✅ main.ts 确认纯净');