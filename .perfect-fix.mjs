import fs from 'node:fs';
import { execSync } from 'node:child_process';

// ===== 1. 修复 preload 暴露的 API =====

const pPreload = 'D:/cuckoo-code/src/app/shell-preload.ts';
let preload = fs.readFileSync(pPreload, 'utf8');
if (!preload.includes('listMemories')) {
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
  ].join('\n');
  preload = preload.replace('contextBridge.exposeInMainWorld(\'shellAPI\', {', 'contextBridge.exposeInMainWorld(\'shellAPI\', {\n' + apis);
  fs.writeFileSync(pPreload, preload, 'utf8');
  console.log('✅ preload API 已补齐');
}

// ===== 2. 确保主进程注册了 IPC =====

const pIpc = 'D:/cuckoo-code/src/app/ipc/index.ts';
let ipc = fs.readFileSync(pIpc, 'utf8');
if (!ipc.includes('registerMemoryIpc')) {
  ipc = ipc.replace("import { registerWindowGroupsIpc, onSwitchShareResult } from './window-groups.js';", "import { registerWindowGroupsIpc, onSwitchShareResult } from './window-groups.js';\nimport { registerMemoryIpc } from './memory.js';\nimport { registerSnapshotIpc } from './snapshot.js';");
  ipc = ipc.replace('  registerWindowGroupsIpc();', '  registerWindowGroupsIpc();\n  registerMemoryIpc();\n  registerSnapshotIpc();');
  fs.writeFileSync(pIpc, ipc, 'utf8');
  console.log('✅ 主进程 IPC 已补齐');
}

// ===== 3. 修复 shared.ts 里的 api 定义 =====

const pShared = 'D:/cuckoo-code/src/ui/shell/scripts/shared.ts';
let shared = fs.readFileSync(pShared, 'utf8');
if (!shared.includes('listMemories')) {
  const apis = [
    '  listMemories: () => (window as any).shellAPI.listMemories(),',
    '  addMemory: (text: string) => (window as any).shellAPI.addMemory(text),',
    '  updateMemory: (id: string, text: string) => (window as any).shellAPI.updateMemory(id, text),',
    '  deleteMemory: (id: string) => (window as any).shellAPI.deleteMemory(id),',
    '  listSnapshots: () => (window as any).shellAPI.listSnapshots(),',
    '  createSnapshot: (name: string) => (window as any).shellAPI.createSnapshot(name),',
    '  restoreSnapshot: (id: string) => (window as any).shellAPI.restoreSnapshot(id),',
  ].join('\n');
  shared = shared.replace('export const api = {', 'export const api = {\n' + apis);
  fs.writeFileSync(pShared, shared, 'utf8');
  console.log('✅ 前端 api 对象已补齐');
}

// ===== 4. 恢复官方原版图标 =====

const officialFrame = execSync('git show upstream/master:src/ui/shell/scripts/shell-frame.tsx', { encoding: 'utf8' });
fs.writeFileSync('D:/cuckoo-code/src/ui/shell/scripts/shell-frame.tsx', officialFrame, 'utf8');
console.log('✅ 已恢复官方原版图标');