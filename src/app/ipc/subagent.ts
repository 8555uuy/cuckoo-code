/**
 * IPC：子代理回复上报 + 进度 + 列表
 */
import { createRequire } from 'node:module';
import * as windowState from '../window.js';
import { onSubagentResponse, listRunning, updateRunning, getGatewayStream } from '../subagent.js';

const require = createRequire(import.meta.url);
const { ipcMain } = require('electron');

function registerSubagentIpc(): void {
  // 子代理 bridge 上报最终文本
  ipcMain.handle('subagent-response', async (event: any, { text }: any) => {
    let ctx = windowState.getContextByWebContents(event.sender);
    if (!ctx) {
      const all = windowState.getAllContexts();
      for (const c of all) {
        if (c.view && c.view.webContents && c.view.webContents.id === event.sender.id) { ctx = c; break; }
        if (c.win && c.win.webContents && c.win.webContents.id === event.sender.id) { ctx = c; break; }
      }
    }
    if (ctx && ctx.win && !ctx.win.isDestroyed()) {
      onSubagentResponse(ctx.win.id, text || '');
    }
    return { success: true };
  });

  // 子代理 bridge 上报进度（逐字流 / 轮次 / 状态）
  ipcMain.on('subagent-progress', (event: any, payload: any = {}) => {
    const ctx = windowState.getContextByWebContents(event.sender);
    if (!ctx || !ctx.win || ctx.win.isDestroyed()) return;
    // 网关查询窗口：把流式进度（思考/正文）转发给主进程的等待方
    if (payload.done) {
      onSubagentResponse(ctx.win.id, payload.text || '');
    }
    const gwCb = getGatewayStream(ctx.win.id);
    if (gwCb) {
      try { gwCb({ think: payload.think, text: payload.text, preview: payload.preview, done: !!payload.done }); } catch (_) { /* ignore */ }
    }
    const patch: any = {};
    if (typeof payload.turn === 'number') patch.turn = payload.turn;
    if (typeof payload.preview === 'string') patch.preview = payload.preview;
    if (typeof payload.status === 'string') patch.status = payload.status;
    updateRunning(ctx.win.id, patch);
  });

  // 取运行中子代理列表（壳页面用；传 parentWindowId 只取该窗口下的）
  ipcMain.handle('subagent-list', async (_event: any, { parentWindowId }: any = {}) => {
    return { success: true, subagents: listRunning(parentWindowId) };
  });
}

export { registerSubagentIpc };
