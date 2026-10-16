/**
 * IPC handler 注册表 + 内部调用器
 *
 * 背景：手机端（局域网控制插件）要走"壳页桥"调用主进程能力，
 * 但现有 IPC handler 都是 ipcMain.handle 注册的，无法直接调用。
 *
 * 做法：在 registerIpcHandlers 期间临时包装 ipcMain.handle，把所有
 * handler 抓进 registry；之后提供 invokeIpc(channel, args)，
 * 用「活跃窗口」的 webContents 作为 event.sender 调用——
 * 这样依赖 event.sender 的 handler 也能正常工作。
 *
 * 安全：只对白名单 channel 开放（见 plugin-control）。
 */
import { createRequire } from 'node:module';
import * as windowState from '../window.js';

const require = createRequire(import.meta.url);
const { ipcMain } = require('electron');

/** channel → handler */
const handlers = new Map<string, (event: any, ...args: any[]) => any>();

/** 在注册期间抓取所有 ipcMain.handle（由 registerIpcHandlers 调用） */
function captureHandlers(register: () => void): void {
  const orig = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = (channel: string, fn: any) => {
    handlers.set(channel, fn);
    return orig(channel, fn);
  };
  try {
    register();
  } finally {
    ipcMain.handle = orig;
  }
}

/** 已注册的 channel 列表（调试用） */
function listChannels(): string[] {
  return Array.from(handlers.keys());
}

/**
 * 用「活跃窗口」作 sender 调用一个 IPC handler。
 * @param channel IPC 通道名（如 'list-memories'）
 * @param args 参数对象（对应 handler 的第二个参数）
 */
async function invokeIpc(channel: string, args?: any): Promise<any> {
  const fn = handlers.get(channel);
  if (typeof fn !== 'function') throw new Error('未注册的通道: ' + channel);
  const ctx: any = windowState.getMainContext();
  const sender = ctx && ctx.win && !ctx.win.isDestroyed() ? ctx.win.webContents : null;
  const fakeEvent = { sender, _internal: true };
  return await fn(fakeEvent, args);
}

export { captureHandlers, invokeIpc, listChannels };
