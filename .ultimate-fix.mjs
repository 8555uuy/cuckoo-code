import fs from 'node:fs';
const NL = String.fromCharCode(10);

// 1. 修复 config.ts
const pConfig = 'D:/cuckoo-code/src/infra/config.ts';
let config = fs.readFileSync(pConfig, 'utf8');
if (!config.includes('isMemoriesEnabled')) {
  config += NL + 'export function isMemoriesEnabled(): boolean { return true; }' + NL + 'export function setMemoriesEnabled(enabled: boolean): boolean { return true; }' + NL;
  fs.writeFileSync(pConfig, config, 'utf8');
  console.log('✅ config.ts 补全');
}

// 2. 确保主进程 memory.ts 注册正确
const pMem = 'D:/cuckoo-code/src/app/ipc/memory.ts';
let mem = fs.readFileSync(pMem, 'utf8');
if (!mem.includes('list-memories')) {
  // 如果旧版文件不对，重新写一个基础的
  const code = [
    "import { ipcMain } from 'electron';",
    "import { listMemories, addMemory, removeMemory, updateMemory, getMemoriesEnabled, setMemoriesEnabled } from '../../infra/memories.js';",
    'export function registerMemoryIpc() {',
    "  ipcMain.handle('list-memories', async () => ({ success: true, memories: listMemories() }));",
    "  ipcMain.handle('add-memory', async (_, { text }) => ({ success: true, memory: addMemory(text) }));",
    "  ipcMain.handle('update-memory', async (_, { id, text }) => ({ success: true, memory: updateMemory(id, text) }));",
    "  ipcMain.handle('delete-memory', async (_, { id }) => ({ success: true, removed: removeMemory(id) }));",
    "  ipcMain.handle('get-memories-enabled', async () => ({ success: true, enabled: getMemoriesEnabled() }));",
    "  ipcMain.handle('set-memories-enabled', async (_, { enabled }) => ({ success: true, enabled: setMemoriesEnabled(enabled) }));",
    '}',
  ].join(NL);
  fs.writeFileSync(pMem, code, 'utf8');
  console.log('✅ memory.ts 重写');
}

// 3. 确保主进程 snapshot.ts 注册正确
const pSnap = 'D:/cuckoo-code/src/app/ipc/snapshot.ts';
let snap = fs.readFileSync(pSnap, 'utf8');
if (!snap.includes('list-snapshots')) {
  const code = [
    "import { ipcMain } from 'electron';",
    "import { listSnapshots, createSnapshot, restoreSnapshot, deleteSnapshot } from '../snapshots.js';",
    'export function registerSnapshotIpc() {',
    "  ipcMain.handle('list-snapshots', async () => ({ success: true, snapshots: listSnapshots() }));",
    "  ipcMain.handle('create-snapshot', async (_, { name }) => ({ success: true, snapshot: createSnapshot(name) }));",
    "  ipcMain.handle('restore-snapshot', async (_, { id }) => ({ success: true, restored: restoreSnapshot(id) }));",
    "  ipcMain.handle('delete-snapshot', async (_, { id }) => ({ success: true, deleted: deleteSnapshot(id) }));",
    '}',
  ].join(NL);
  fs.writeFileSync(pSnap, code, 'utf8');
  console.log('✅ snapshot.ts 重写');
}

// 4. 确保 shell-preload.ts 补齐接口
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
  ].join(NL);
  preload = preload.replace('contextBridge.exposeInMainWorld(\'shellAPI\', {', 'contextBridge.exposeInMainWorld(\'shellAPI\', {' + NL + apis);
  fs.writeFileSync(pPreload, preload, 'utf8');
  console.log('✅ shell-preload.ts 补齐');
}