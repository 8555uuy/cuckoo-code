/**
 * IPC：子代理回复上报 + 进度 + 列表
 */
import { createRequire } from 'node:module';
import * as windowState from '../window.js';
import { onSubagentResponse, listRunning, updateRunning } from '../subagent.js';

const require = createRequire(import.meta.url);
const { ipcMain } = require('electron');

function registerSubagentIpc(): void {
  // 子代理 bridge 上报最终文本
  ipcMain.handle('subagent-response', async (event: any, { text }: any) => {
    const ctx = windowState.getContextByWebContents(event.sender);
    if (ctx && ctx.win && !ctx.win.isDestroyed()) {
      onSubagentResponse(ctx.win.id, text || '');
    }
    return { success: true };
  });

  // 子代理 bridge 上报进度（逐字流 / 轮次 / 状态）
  ipcMain.on('subagent-progress', (event: any, payload: any = {}) => {
    const ctx = windowState.getContextByWebContents(event.sender);
    if (!ctx || !ctx.win || ctx.win.isDestroyed()) return;
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
