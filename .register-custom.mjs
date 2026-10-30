import fs from 'node:fs';

// 1. 注册工具 (src/tools/index.ts)
const pTools = 'D:/cuckoo-code/src/tools/index.ts';
let tools = fs.readFileSync(pTools, 'utf8');
if (!tools.includes('RememberTool')) {
  tools = tools.replace("import { GoalDoneTool } from './impl/goal-done.js';", "import { GoalDoneTool } from './impl/goal-done.js';\nimport { RememberTool, ForgetMemoryTool, UpdateMemoryTool } from './impl/remember.js';\nimport { CreateSnapshotTool, ListSnapshotsTool, RestoreSnapshotTool } from './impl/snapshot.js';");
  tools = tools.replace('  registry.register(new GoalDoneTool());', '  registry.register(new GoalDoneTool());\n  registry.register(new RememberTool());\n  registry.register(new ForgetMemoryTool());\n  registry.register(new UpdateMemoryTool());\n  registry.register(new CreateSnapshotTool());\n  registry.register(new ListSnapshotsTool());\n  registry.register(new RestoreSnapshotTool());');
  fs.writeFileSync(pTools, tools, 'utf8');
  console.log('✅ 工具已注册');
}

// 2. 注册 IPC (src/app/ipc/index.ts)
const pIpc = 'D:/cuckoo-code/src/app/ipc/index.ts';
let ipc = fs.readFileSync(pIpc, 'utf8');
if (!ipc.includes('registerMemoryIpc')) {
  ipc = ipc.replace("import { registerWindowGroupsIpc, onSwitchShareResult } from './window-groups.js';", "import { registerWindowGroupsIpc, onSwitchShareResult } from './window-groups.js';\nimport { registerMemoryIpc } from './memory.js';\nimport { registerSnapshotIpc } from './snapshot.js';");
  ipc = ipc.replace('  registerWindowGroupsIpc();', '  registerWindowGroupsIpc();\n  registerMemoryIpc();\n  registerSnapshotIpc();');
  fs.writeFileSync(pIpc, ipc, 'utf8');
  console.log('✅ IPC 已注册');
}

// 3. 注册 UI 页面 (src/ui/shell/scripts/main.ts)
const pMain = 'D:/cuckoo-code/src/ui/shell/scripts/main.ts';
let main = fs.readFileSync(pMain, 'utf8');
if (!main.includes('MemoriesPage')) {
  // 因为官方删了旧版UI，我们这里补回 import 和 registerPage
  main = main.replace("import { FeishuPage } from './pages/feishu-react.js';", "import { FeishuPage } from './pages/feishu-react.js';\nimport { loadMemories as MemoriesPage } from './pages/memories.js';\nimport { loadSnapshots as SnapshotsPage } from './pages/snapshots.js';");
  main = main.replace("  registerPage('feishu', FeishuPage);", "  registerPage('feishu', FeishuPage);\n  registerPage('memories', MemoriesPage as any);\n  registerPage('snapshots', SnapshotsPage as any);");
  fs.writeFileSync(pMain, main, 'utf8');
  console.log('✅ UI 路由已注册');
}

// 4. 注入记忆和快照依赖 (src/app/entry.ts)
const pEntry = 'D:/cuckoo-code/src/app/entry.ts';
let entry = fs.readFileSync(pEntry, 'utf8');
if (!entry.includes('injectMemoryStore')) {
  entry = entry.replace("import { injectGoalDonePusher } from '../tools/impl/goal-done.js';", "import { injectGoalDonePusher } from '../tools/impl/goal-done.js';\nimport { injectMemoryStore } from '../tools/impl/remember.js';\nimport { injectSnapshotStore } from '../tools/impl/snapshot.js';\nimport { addMemory, removeMemory, updateMemory, listMemories } from '../infra/memories.js';\nimport { createSnapshot, listSnapshots, restoreSnapshot } from './snapshots.js';");
  const injectCode = [
    'injectMemoryStore({',
    '  add: (text: string) => { const m = addMemory(text); return m ? { id: m.id } : null; },',
    '  remove: (id: string) => removeMemory(id),',
    '  update: (id: string, text: string) => { const m = updateMemory(id, text); return m ? { id: m.id } : null; },',
    '  list: () => listMemories().map((m) => ({ id: m.id, text: m.text })),',
    '});',
    'injectSnapshotStore({',
    '  create: (projectDir: string, name: string, description?: string) => {',
    '    const m = createSnapshot(projectDir, name, description);',
    '    return { id: m.id, fileCount: m.fileCount, projectDir: m.projectDir };',
    '  },',
    '  list: () => listSnapshots(),',
    '  restore: (id: string) => restoreSnapshot(id)',
    '});'
  ].join('\n');
  entry = entry.replace('injectGoalDonePusher(pushGoalDone);', 'injectGoalDonePusher(pushGoalDone);\n' + injectCode);
  fs.writeFileSync(pEntry, entry, 'utf8');
  console.log('✅ entry.ts 依赖已注入');
}