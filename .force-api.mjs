import fs from 'node:fs';
const NL = String.fromCharCode(10);

// 1. 暴力注入 shell-preload.ts
const pPreload = 'D:/cuckoo-code/src/app/shell-preload.ts';
let preload = fs.readFileSync(pPreload, 'utf8');
if (!preload.includes('listMemories')) {
  // 找 contextBridge.exposeInMainWorld 结束的地方
  // 直接追加 api 对象方法
  const methods = [
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
  ].join(NL);
  // 在最后一行 }); 之前插入
  const lastBrace = preload.lastIndexOf('});');
  if (lastBrace > -1) {
    preload = preload.slice(0, lastBrace) + methods + NL + preload.slice(lastBrace);
    fs.writeFileSync(pPreload, preload, 'utf8');
    console.log('✅ 强行注入 shell-preload.ts');
  }
}

// 2. 暴力注入 shared.ts
const pShared = 'D:/cuckoo-code/src/ui/shell/scripts/shared.ts';
let shared = fs.readFileSync(pShared, 'utf8');
if (!shared.includes('listMemories')) {
  const methods = [
    '  listMemories: () => (window as any).shellAPI.listMemories(),',
    '  addMemory: (text: string) => (window as any).shellAPI.addMemory(text),',
    '  updateMemory: (id: string, text: string) => (window as any).shellAPI.updateMemory(id, text),',
    '  deleteMemory: (id: string) => (window as any).shellAPI.deleteMemory(id),',
    '  listSnapshots: () => (window as any).shellAPI.listSnapshots(),',
    '  createSnapshot: (name: string) => (window as any).shellAPI.createSnapshot(name),',
    '  restoreSnapshot: (id: string) => (window as any).shellAPI.restoreSnapshot(id),',
  ].join(NL);
  // 找 api 对象的结束
  const lastBrace = shared.lastIndexOf('};');
  if (lastBrace > -1) {
    shared = shared.slice(0, lastBrace) + methods + NL + shared.slice(lastBrace);
    fs.writeFileSync(pShared, shared, 'utf8');
    console.log('✅ 强行注入 shared.ts');
  }
}