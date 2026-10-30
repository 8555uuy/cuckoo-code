import fs from 'node:fs';
const NL = String.fromCharCode(10);

// 1. 生成 MemoriesReact.tsx
const memHtml = `<div class="ck-tab" data-panel="memories">
  <div class="ck-actions">
    <button class="ck-btn ck-btn-anim" id="mem-add">
      <svg class="ck-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
      <span>新建记忆</span>
    </button>
    <input class="ck-input" id="mem-search" type="search" placeholder="搜索记忆…" style="flex:1;min-width:0;margin-left:8px" />
    <button class="ck-icon-btn" id="mem-refresh" title="刷新"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg></button>
  </div>
  <p class="ck-about-tip">记忆会随系统提示词发给模型。无条数/长度限制。</p>
  <div class="ck-list" id="mem-list"><div class="ck-list-empty">加载中…</div></div>
</div>`;
const memTsx = [
  "import React, { useEffect, useRef } from 'react';",
  "import { loadMemories } from './memories.js';",
  'export function MemoriesReact() {',
  '  const ref = useRef<HTMLDivElement>(null);',
  '  useEffect(() => {',
  '    if (ref.current) ref.current.innerHTML = ' + JSON.stringify(memHtml) + ';',
  '    setTimeout(() => { if (typeof loadMemories === \'function\') loadMemories(); }, 50);',
  '  }, []);',
  "  return React.createElement('div', { ref, style: { height: '100%', overflow: 'auto', padding: '16px' } });",
  '}',
].join(NL);
fs.writeFileSync('D:/cuckoo-code/src/ui/shell/scripts/pages/memories-react.tsx', memTsx, 'utf8');

// 2. 生成 SnapshotsReact.tsx
const snapHtml = `<div class="ck-tab" data-panel="snapshots">
  <div class="ck-actions">
    <button class="ck-btn ck-btn-anim" id="snap-create">新建快照</button>
    <button class="ck-icon-btn" id="snap-refresh" title="刷新"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg></button>
  </div>
  <p class="ck-about-tip">快照会在恢复前自动创建回滚备份，防止数据丢失。</p>
  <div class="ck-list" id="snap-list"><div class="ck-list-empty">加载中…</div></div>
</div>`;
const snapTsx = [
  "import React, { useEffect, useRef } from 'react';",
  "import { loadSnapshots } from './snapshots.js';",
  'export function SnapshotsReact() {',
  '  const ref = useRef<HTMLDivElement>(null);',
  '  useEffect(() => {',
  '    if (ref.current) ref.current.innerHTML = ' + JSON.stringify(snapHtml) + ';',
  '    setTimeout(() => { if (typeof loadSnapshots === \'function\') loadSnapshots(); }, 50);',
  '  }, []);',
  "  return React.createElement('div', { ref, style: { height: '100%', overflow: 'auto', padding: '16px' } });",
  '}',
].join(NL);
fs.writeFileSync('D:/cuckoo-code/src/ui/shell/scripts/pages/snapshots-react.tsx', snapTsx, 'utf8');

// 3. 在 shell-frame.tsx 的侧边栏配置里加上图标
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
  console.log('✅ 侧边栏图标已添加');
}

// 4. 在 main.ts 注册
const pMain = 'D:/cuckoo-code/src/ui/shell/scripts/main.ts';
let main = fs.readFileSync(pMain, 'utf8');
if (!main.includes('MemoriesReact')) {
  main = main.replace("import { FeishuPage } from './pages/feishu-react.js';", "import { FeishuPage } from './pages/feishu-react.js';" + NL + "import { MemoriesReact } from './pages/memories-react.js';" + NL + "import { SnapshotsReact } from './pages/snapshots-react.js';");
  main = main.replace("  registerPage('feishu', FeishuPage);", "  registerPage('feishu', FeishuPage);" + NL + "  registerPage('memories', MemoriesReact);" + NL + "  registerPage('snapshots', SnapshotsReact);");
  fs.writeFileSync(pMain, main, 'utf8');
  console.log('✅ React 页面已注册');
}