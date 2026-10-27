/**
 * 日志开关与持久化（主进程日志 + 渲染进程 console 转发）
 *
 * 设计：
 *  - 开关设置存 `<userData>/log-settings.json`（主进程启动时能同步读，不依赖 AI 页面 localStorage）
 *  - console.log / warn / error 在启动时无条件挂钩，写入时再看 enabled 开关（切换后立即生效）
 *  - 渲染进程 console 通过 appendRendererLog 写入同一文件
 *  - 日志文件：`<userData>/wyp/log/electron.log`
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ipcMain, app, shell } = require('electron');

let enabled = false;
let logStream: fs.WriteStream | null = null;
let hooked = false;

function getLogDir(): string { return path.join(app.getPath('userData'), 'wyp', 'log'); }
function getLogFile(): string { return path.join(getLogDir(), 'electron.log'); }
function getSettingsFile(): string { return path.join(app.getPath('userData'), 'log-settings.json'); }

function readSettings(): { enabled: boolean } {
  try {
    const raw = fs.readFileSync(getSettingsFile(), 'utf-8');
    const obj = JSON.parse(raw);
    return { enabled: !!obj.enabled };
  } catch {
    return { enabled: false };
  }
}

function writeSettings(s: { enabled: boolean }): void {
  try {
    fs.mkdirSync(path.dirname(getSettingsFile()), { recursive: true });
    fs.writeFileSync(getSettingsFile(), JSON.stringify(s, null, 2), 'utf-8');
  } catch (_) { /* ignore */ }
}

function openStream(): void {
  try {
    fs.mkdirSync(getLogDir(), { recursive: true });
    logStream = fs.createWriteStream(getLogFile(), { flags: 'a' });
  } catch (_) { logStream = null; }
}

function closeStream(): void {
  if (logStream) {
    try { logStream.end(); } catch (_) { /* ignore */ }
    logStream = null;
  }
}

function stringify(a: any): string {
  if (typeof a === 'string') return a;
  try { return JSON.stringify(a); } catch (_) { return String(a); }
}

function writeToFile(level: string, args: any[]): void {
  if (!enabled || !logStream) return;
  try {
    const line = '[' + new Date().toISOString() + '] [' + level + '] ' + args.map(stringify).join(' ') + String.fromCharCode(10);
    logStream.write(line);
  } catch (_) { /* ignore */ }
}

const origLog = console.log.bind(console);
const origErr = console.error.bind(console);
const origWarn = console.warn.bind(console);

function hookConsoleOnce(): void {
  if (hooked) return;
  hooked = true;
  console.log = (...args: any[]) => { origLog(...args); writeToFile('LOG', args); };
  console.error = (...args: any[]) => { origErr(...args); writeToFile('ERR', args); };
  console.warn = (...args: any[]) => { origWarn(...args); writeToFile('WARN', args); };
}

/** 启动时调用：读配置 → 挂钩 console → 如果已开启则打开写入流 */
export function initLogging(): void {
  // 开发版已经由 start.js 把主进程 stdout/stderr 写入 wyp/log/electron.log，
  // 这里只在打包版生效，避免重复写入。
  if (!app.isPackaged) return;
  try {
    enabled = readSettings().enabled;
  } catch (_) { enabled = false; }
  hookConsoleOnce();
  if (enabled) openStream();
}

/** 渲染进程 console-message 调用（门控在 enabled 里） */
export function appendRendererLog(source: string, message: string): void {
  writeToFile('RENDERER:' + source, [message]);
}

/** 日志文件信息（供设置页展示） */
export function getLogInfo(): { enabled: boolean; dir: string; file: string; size: number } {
  let size = 0;
  try { size = fs.statSync(getLogFile()).size; } catch (_) { /* ignore */ }
  return { enabled, dir: getLogDir(), file: getLogFile(), size };
}

export function registerLogIpc(): void {
  ipcMain.handle('get-log-info', async () => {
    try { return { success: true, ...getLogInfo() }; }
    catch (e: any) { return { success: false, error: e && e.message ? e.message : String(e) }; }
  });
  ipcMain.handle('set-log-enabled', async (_e: any, { enabled: next }: any) => {
    try {
      const on = !!next;
      writeSettings({ enabled: on });
      enabled = on;
      if (on) {
        if (!logStream) openStream();
      } else {
        closeStream();
      }
      return { success: true, enabled };
    } catch (e: any) {
      return { success: false, error: e && e.message ? e.message : String(e) };
    }
  });
  ipcMain.handle('delete-logs', async () => {
    try {
      closeStream();
      const dir = getLogDir();
      if (fs.existsSync(dir)) {
        for (const f of fs.readdirSync(dir)) {
          try { fs.rmSync(path.join(dir, f), { force: true }); } catch (_) { /* ignore */ }
        }
      }
      if (enabled) openStream();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e && e.message ? e.message : String(e) };
    }
  });
  ipcMain.handle('open-log-dir', async () => {
    try {
      const dir = getLogDir();
      fs.mkdirSync(dir, { recursive: true });
      await shell.openPath(dir);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e && e.message ? e.message : String(e) };
    }
  });
}
