import fs from 'node:fs';
const NL = String.fromCharCode(10);

// 重新安全地覆盖 main.ts 里的 registerPage，确保它们绝对不是 async
const pMain = 'D:/cuckoo-code/src/ui/shell/scripts/main.ts';
let main = fs.readFileSync(pMain, 'utf8');
// 移除可能出现问题的 async 或者替换为明确的组件
main = main.replace(/export async function MemoriesReact/g, 'export function MemoriesReact');
main = main.replace(/export async function SnapshotsReact/g, 'export function SnapshotsReact');
fs.writeFileSync(pMain, main, 'utf8');

// 检查 memories-react.tsx 是不是被写成了 async
const pMem = 'D:/cuckoo-code/src/ui/shell/scripts/pages/memories-react.tsx';
let mem = fs.readFileSync(pMem, 'utf8');
mem = mem.replace(/export async function MemoriesReact/g, 'export function MemoriesReact');
fs.writeFileSync(pMem, mem, 'utf8');

const pSnap = 'D:/cuckoo-code/src/ui/shell/scripts/pages/snapshots-react.tsx';
let snap = fs.readFileSync(pSnap, 'utf8');
snap = snap.replace(/export async function SnapshotsReact/g, 'export function SnapshotsReact');
fs.writeFileSync(pSnap, snap, 'utf8');

console.log('✅ 已强制修正为非 async 组件');