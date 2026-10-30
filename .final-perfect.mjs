import fs from 'node:fs';
const NL = String.fromCharCode(10);

// 1. 重新在官方 shell-frame.tsx 里插入图标
const pFrame = 'D:/cuckoo-code/src/ui/shell/scripts/shell-frame.tsx';
let frame = fs.readFileSync(pFrame, 'utf8');
if (!frame.includes("id: 'memories'")) {
  const anchor = "{ id: 'plugins', title: '插件', icon: 'M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v3.8h1.5a2.2 2.2 0 0 1 0 4.4H2V19a2 2 0 0 0 2 2h3.8v-1.5a2.2 2.2 0 0 1 4.4 0V21H18a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z' },";
  const newIcons = [
    anchor,
    "{ id: 'memories', title: '记忆', icon: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 15a1 1 0 1 1 1-1 1 1 0 0 1-1 1zm1-4h-2V7h2z' },",
    "{ id: 'snapshots', title: '快照', icon: 'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z' },"
  ].join(NL);
  frame = frame.replace(anchor, newIcons);
  fs.writeFileSync(pFrame, frame, 'utf8');
  console.log('✅ 记忆和快照图标已插入');
}

// 2. 检查 memory.ts 的 IPC 通道名是否匹配
const pMem = 'D:/cuckoo-code/src/app/ipc/memory.ts';
let mem = fs.readFileSync(pMem, 'utf8');
const expectedChannels = ['list-memories', 'add-memory', 'update-memory', 'delete-memory', 'get-memories-enabled', 'set-memories-enabled'];
for (const ch of expectedChannels) {
  if (!mem.includes(ch)) {
    console.log('⚠️ 警告: memory.ts 里缺失通道 ' + ch);
  }
}

// 3. 检查 snapshot.ts 的 IPC 通道名是否匹配
const pSnap = 'D:/cuckoo-code/src/app/ipc/snapshot.ts';
let snap = fs.readFileSync(pSnap, 'utf8');
const snapChannels = ['list-snapshots', 'create-snapshot', 'restore-snapshot', 'delete-snapshot'];
for (const ch of snapChannels) {
  if (!snap.includes(ch)) {
    console.log('⚠️ 警告: snapshot.ts 里缺失通道 ' + ch);
  }
}

console.log('✅ IPC 通道校验完成');