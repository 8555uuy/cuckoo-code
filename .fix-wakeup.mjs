import fs from 'node:fs';
const NL = String.fromCharCode(10);
const p = 'D:/cuckoo-code/src/app/ipc/subagent.ts';
let s = fs.readFileSync(p, 'utf8');

// 1. 增强 subagent-response 的容错（找不到 ctx 时兜底）
const oldResp = [
  "  ipcMain.handle('subagent-response', async (event: any, { text }: any) => {",
  '    const ctx = windowState.getContextByWebContents(event.sender);',
  '    if (ctx && ctx.win && !ctx.win.isDestroyed()) {',
  "      onSubagentResponse(ctx.win.id, text || '');",
  '    }',
  '    return { success: true };',
  '  });'
].join(NL);

const newResp = [
  "  ipcMain.handle('subagent-response', async (event: any, { text }: any) => {",
  '    let ctx = windowState.getContextByWebContents(event.sender);',
  '    // 兜底：如果找不到，遍历所有窗口',
  '    if (!ctx) {',
  '      const all = windowState.getAllContexts();',
  '      for (const c of all) {',
  '        if (c.view && c.view.webContents && c.view.webContents.id === event.sender.id) { ctx = c; break; }',
  '        if (c.win && c.win.webContents && c.win.webContents.id === event.sender.id) { ctx = c; break; }',
  '      }',
  '    }',
  '    if (ctx && ctx.win && !ctx.win.isDestroyed()) {',
  "      onSubagentResponse(ctx.win.id, text || '');",
  '    }',
  '    return { success: true };',
  '  });'
].join(NL);

if (s.includes(oldResp)) {
  s = s.replace(oldResp, newResp);
  console.log('✅ subagent-response 已加容错');
} else {
  console.log('❌ subagent-response 未匹配');
}

// 2. 在 subagent-progress 收到 done 时，也强制唤醒
const oldProg = [
  "  ipcMain.on('subagent-progress', (event: any, payload: any = {}) => {",
  '    const ctx = windowState.getContextByWebContents(event.sender);',
  '    if (!ctx || !ctx.win || ctx.win.isDestroyed()) return;',
  '    // 网关查询窗口：把流式进度（思考/正文）转发给主进程的等待者'
].join(NL);

const newProg = [
  "  ipcMain.on('subagent-progress', (event: any, payload: any = {}) => {",
  '    const ctx = windowState.getContextByWebContents(event.sender);',
  '    if (!ctx || !ctx.win || ctx.win.isDestroyed()) return;',
  '    if (payload.done) {',
  "      onSubagentResponse(ctx.win.id, payload.text || '');",
  '    }',
  '    // 网关查询窗口：把流式进度（思考/正文）转发给主进程的等待者'
].join(NL);

if (s.includes(oldProg)) {
  s = s.replace(oldProg, newProg);
  console.log('✅ subagent-progress 已加强制唤醒');
} else {
  console.log('❌ subagent-progress 未匹配');
}

fs.writeFileSync(p, s, 'utf8');
console.log('done');