import fs from 'node:fs';
import { execSync } from 'node:child_process';
const NL = String.fromCharCode(10);

// 1. 彻底恢复官方的 shared.ts
const officialShared = execSync('git show upstream/master:src/ui/shell/scripts/shared.ts', { encoding: 'utf8' });
fs.writeFileSync('D:/cuckoo-code/src/ui/shell/scripts/shared.ts', officialShared, 'utf8');
console.log('✅ shared.ts 已恢复官方纯净版');

// 2. 精准注入 shell-preload.ts
const pPreload = 'D:/cuckoo-code/src/app/shell-preload.ts';
const L = fs.readFileSync(pPreload, 'utf8').split(NL);

// 找到 shellAPI 对象结束的那一行（通常是 } 或 };）
let injectIdx = -1;
for (let i = 50; i < 240; i++) {
  if (L[i] && L[i].trim() === '};' && L[i-1].includes('clearLogs') || L[i-1].includes('openExternal') || L[i-1].includes('setAiViewVisible')) {
    injectIdx = i;
    break;
  }
}

// 如果没找到特定特征，找 contextBridge 之前的最后一个 };
if (injectIdx === -1) {
  for (let i = 240; i >= 0; i--) {
    if (L[i] && L[i].trim() === '};') {
      injectIdx = i;
      break;
    }
  }
}

if (injectIdx > 0) {
  const apis = [
    '  listMemories: () => ipcRenderer.invoke(\'list-memories\'),',
    '  addMemory: (text: string) => ipcRenderer.invoke(\'add-memory\', { text }),',
    '  updateMemory: (id: string, text: string) => ipcRenderer.invoke(\'update-memory\', { id, text }),',
    '  deleteMemory: (id: string) => ipcRenderer.invoke(\'delete-memory\', { id }),',
    '  getMemoriesEnabled: () => ipcRenderer.invoke(\'get-memories-enabled\'),',
    '  setMemoriesEnabled: (enabled: boolean) => ipcRenderer.invoke(\'set-memories-enabled\', { enabled }),',
    '  listSnapshots: () => ipcRenderer.invoke(\'list-snapshots\'),',
    '  createSnapshot: (name: string) => ipcRenderer.invoke(\'create-snapshot\', { name }),',
    '  restoreSnapshot: (id: string) => ipcRenderer.invoke(\'restore-snapshot\', { id }),',
    '  deleteSnapshot: (id: string) => ipcRenderer.invoke(\'delete-snapshot\', { id }),',
  ];
  L.splice(injectIdx, 0, ...apis);
  fs.writeFileSync(pPreload, L.join(NL), 'utf8');
  console.log('✅ shell-preload.ts 已精准注入');
} else {
  console.log('❌ 找不到注入点');
}