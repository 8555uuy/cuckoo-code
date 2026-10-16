/**
 * 插件控制面（主进程 ↔ 插件 双向通道）
 *
 * 目的：让 providers/*.js 插件能：
 *   1. 调用主进程能力（发消息、停止、切会话、导航等）→ 通过 globalThis.__cuckooPluginControl
 *   2. 接收主进程事件（AI 流式输出等）→ 主进程调用 __cuckooPluginHostFns['<id>:onEvent'](payload)
 *
 * 与现有 plugin-host-call 方向相反：那个是插件注册函数供壳页面调；
 * 这个是主进程暴露能力供插件调 + 主动把事件推给插件。
 */
import { createRequire } from 'node:module';
import * as windowState from '../window.js';
import { invokeIpc } from './registry.js';

const require = createRequire(import.meta.url);

/**
 * 壳页桥白名单：手机端只允许调用这些 IPC channel。
 * 全部来自界面实际用到的能力。
 */
const SHELL_BRIDGE_ALLOW: string[] = [
  // —— 窗口/项目 ——
  'get-project-dir', 'init-project', 'get-app-info', 'list-providers',
  // —— 会话（工作区）——
  'list-all-sessions', 'navigate-session', 'set-session-archived', 'get-dir-info',
  'set-project-archived', 'set-session-title', 'new-conversation-for-project',
  'read-session-history',
  'web-list-sessions', 'web-navigate-session', 'web-new-conversation',
  // —— 项目文件（只读）——
  'list-project-tree', 'read-project-file',
  // —— 提示词 ——
  'list-snippets', 'save-snippets', 'trigger-snippet',
  // —— 记忆 ——
  'list-memories', 'save-memories', 'add-memory', 'delete-memory',
  'get-memories-enabled', 'set-memories-enabled',
  // —— 快照 ——
  'list-snapshots', 'create-snapshot', 'restore-snapshot', 'delete-snapshot',
  // —— 技能 / 子代理 ——
  'list-skills', 'list-agents',
  // —— MCP ——
  'list-mcp-servers', 'enable-mcp-server', 'disable-mcp-server',
  // —— 窗口 ——
  'list-profiles', 'list-providers', 'create-profile-window', 'open-profile-window',
  // —— 插件 ——
  'plugin-market-list', 'plugin-market-remote', 'plugin-install', 'plugin-uninstall',
  'plugin-list-installed', 'plugin-set-enabled', 'cuckoo-plugin-list',
  'cuckoo-plugin-toggle',
  // —— 设置 / 主题 ——
  'get-settings', 'save-settings', 'reset-settings',
  'theme-get', 'theme-set', 'theme-list',
  // —— 子代理运行态 ——
  'subagent-list',
  // —— 自动压缩 ——
  'get-autocompact', 'save-autocompact', 'trigger-compact',
  // —— 关于 / 系统 ——
  'check-update', 'get-asset-url', 'get-system-total',
];
const ALLOW_SET = new Set(SHELL_BRIDGE_ALLOW);

let installed = false;

/** 取当前活跃窗口上下文 */
function activeCtx(): any {
  return windowState.getMainContext();
}

/** 给活跃窗口的 AI 页面发消息（走 bridge 的 harness-user-message 通道） */
function sendMessageToActive(text: string): { success: boolean; error?: string } {
  if (typeof text !== 'string' || !text) return { success: false, error: 'empty-text' };
  const ctx: any = activeCtx();
  if (!ctx || !ctx.view || ctx.view.webContents.isDestroyed()) {
    return { success: false, error: 'no-ai-view' };
  }
  try {
    ctx.view.webContents.send('harness-user-message', { text });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e && e.message ? e.message : String(e) };
  }
}

/** 组装控制面对象 */
function buildControl() {
  return {
    // ========== 状态 ==========

    /** 取活跃窗口状态 */
    getStatus() {
      const ctx: any = activeCtx();
      if (!ctx) return { success: false, error: 'no-context' };
      let url = '';
      try { url = (ctx.view && ctx.view.webContents && !ctx.view.webContents.isDestroyed()) ? ctx.view.webContents.getURL() : ''; } catch (_) { /* ignore */ }
      return {
        success: true,
        providerId: ctx.providerId || '',
        url,
        projectDir: (ctx.sessionStore && ctx.sessionStore.state && ctx.sessionStore.state.selectedProjectDir) || null,
        sessionId: (ctx.sessionStore && ctx.sessionStore.state && ctx.sessionStore.state.currentSessionId) || null,
        windowId: (ctx.win && ctx.win.id) || null,
        isSubagent: !!ctx.isSubagent,
      };
    },

    /** 列出所有窗口 */
    listWindows() {
      try {
        const main = activeCtx();
        return {
          success: true,
          windows: windowState.getAllContexts().map((c: any) => ({
            id: c.win && c.win.id,
            providerId: c.providerId || '',
            isSubagent: !!c.isSubagent,
            isMain: !!(main && c.win && main.win && c.win.id === main.win.id),
          })),
        };
      } catch (e: any) {
        return { success: false, error: e && e.message ? e.message : String(e) };
      }
    },

    /** 切换活跃窗口 */
    setActiveWindow(windowId: number) {
      try {
        const ctx = windowState.getWindowContext(windowId);
        if (!ctx) return { success: false, error: 'no-window' };
        windowState.setMainWindow(ctx.win);
        return { success: true, windowId };
      } catch (e: any) {
        return { success: false, error: e && e.message ? e.message : String(e) };
      }
    },

    /** 列出已加载的平台 */
    async listProviders() {
      try {
        const { getAllProviders } = await import('../../providers/registry.js');
        const ctx: any = activeCtx();
        const list = getAllProviders().map((p: any) => ({ id: p.id, name: p.name || p.id }));
        return { success: true, providers: list, current: ctx ? (ctx.providerId || '') : '' };
      } catch (e: any) {
        return { success: false, error: e && e.message ? e.message : String(e) };
      }
    },

    /** 应用信息（版本） */
    async getAppInfo() {
      try {
        const { app } = require('electron');
        return { success: true, version: app.getVersion() };
      } catch (e: any) {
        return { success: false, error: e && e.message ? e.message : String(e) };
      }
    },

    // ========== 会话 ==========

    /** 列出所有会话 */
    listSessions() {
      try {
        const ctx: any = activeCtx();
        const store = ctx ? ctx.sessionStore : null;
        if (!store) return { success: true, sessions: [], currentSessionId: null };
        const all = store.readSessionStore();
        const sessions = Object.keys(all).map((id) => {
          const meta = store.getSessionMeta(id);
          return {
            sessionId: id,
            projectDir: meta.projectDir,
            title: meta.title,
            createdAt: meta.createdAt,
            updatedAt: meta.updatedAt,
            archived: meta.archived === true,
          };
        }).filter((s: any) => !!s.projectDir);
        return {
          success: true,
          sessions,
          currentSessionId: (store.state && store.state.currentSessionId) || null,
          currentProjectDir: (store.state && store.state.selectedProjectDir) || null,
        };
      } catch (e: any) {
        return { success: false, error: e && e.message ? e.message : String(e), sessions: [] };
      }
    },

    /**
     * 读取 AI 官网侧栏的真实会话列表（注入 AI 页面主世界执行抓取）。
     */
    async listWebSessions() {
      try {
        const ctx: any = activeCtx();
        const view = ctx ? ctx.view : null;
        if (!view || !view.webContents || view.webContents.isDestroyed()) {
          return { success: false, error: 'no-ai-view', sessions: [] };
        }
        const { getProvider } = await import('../../providers/registry.js');
        const provider = (ctx && ctx.providerId) ? getProvider(ctx.providerId) : null;
        const base = (provider && provider.sessionUrlBase) || '';
        const shellMod: any = await import('./shell.js');
        const fn = (provider && typeof provider.getSessionListFn === 'function')
          ? provider.getSessionListFn()
          : shellMod.getDefaultSessionListFn();
        if (typeof fn !== 'function') return { success: false, error: 'no-list-fn', sessions: [] };
        const list = await view.webContents.executeJavaScript(
          '(' + fn.toString() + ')(document, window, ' + JSON.stringify(base) + ')'
        );
        return { success: true, sessions: list || [], currentUrl: view.webContents.getURL(), providerId: ctx.providerId || '' };
      } catch (e: any) {
        return { success: false, error: e && e.message ? e.message : String(e), sessions: [] };
      }
    },

    /** 按官网会话 URL 直接导航 */
    async navigateUrl(url: string) {
      if (!url || !/^https?:\/\//i.test(url)) return { success: false, error: 'bad-url' };
      try {
        const ctx: any = activeCtx();
        if (!ctx || !ctx.view || ctx.view.webContents.isDestroyed()) return { success: false, error: 'no-ai-view' };
        await ctx.view.webContents.loadURL(url);
        return { success: true, url };
      } catch (e: any) {
        return { success: false, error: e && e.message ? e.message : String(e) };
      }
    },

    /** 切换会话 */
    async navigateSession(sessionId: string) {
      if (!sessionId) return { success: false, error: 'no-session-id' };
      try {
        const ctx: any = activeCtx();
        if (!ctx || !ctx.view || ctx.view.webContents.isDestroyed()) {
          return { success: false, error: 'no-ai-view' };
        }
        const { getProviderByUrl } = await import('../../providers/registry.js');
        let url: string | null = null;
        try {
          const provider = getProviderByUrl(ctx.view.webContents.getURL());
          if (provider && typeof provider.sessionUrlBase === 'string' && provider.sessionUrlBase) {
            url = provider.sessionUrlBase + sessionId;
          }
        } catch (_) { /* provider 未识别 */ }
        if (!url) return { success: false, error: '无法确定会话 URL' };
        await ctx.view.webContents.loadURL(url);
        return { success: true, url };
      } catch (e: any) {
        return { success: false, error: e && e.message ? e.message : String(e) };
      }
    },

    /** 按项目目录新建对话 */
    async newConversationForProject(projectDir: string) {
      if (!projectDir) return { success: false, error: 'no-project-dir' };
      try {
        const ctx: any = activeCtx();
        if (!ctx || !ctx.view || ctx.view.webContents.isDestroyed()) {
          return { success: false, error: 'no-ai-view' };
        }
        const { getProvider } = await import('../../providers/registry.js');
        const provider = ctx.providerId ? getProvider(ctx.providerId) : null;
        const homeUrl = provider && provider.homeUrl ? provider.homeUrl : null;
        if (!homeUrl) return { success: false, error: 'no-home-url' };
        const { initProject } = await import('../../session/project-context.js');
        const m: any = await import('./harness.js');
        const wc = ctx.view.webContents;
        const onLoad = () => {
          try { wc.off('did-finish-load', onLoad); } catch (_) { /* ignore */ }
          setTimeout(async () => {
            try { await initProject(false, ctx, projectDir, false, '', false); } catch (_) { /* ignore */ }
          }, 2000);
        };
        try { wc.on('did-finish-load', onLoad); } catch (_) { /* ignore */ }
        if (m && typeof m.prepareNewConversation === 'function') m.prepareNewConversation(ctx);
        await wc.loadURL(homeUrl);
        return { success: true, projectDir };
      } catch (e: any) {
        return { success: false, error: e && e.message ? e.message : String(e) };
      }
    },

    // ========== 生成控制 ==========

    /** 给活跃窗口的 AI 发消息 */
    sendMessage(text: string) { return sendMessageToActive(text); },

    /** 停止当前生成 */
    async stop() {
      try {
        const m: any = await import('./harness.js');
        const ctx: any = activeCtx();
        if (!ctx) return { success: false, error: 'no-context' };
        return await m.stopGeneration(ctx);
      } catch (e: any) {
        return { success: false, error: e && e.message ? e.message : String(e) };
      }
    },

    /** 新对话（导航到平台首页） */
    async newConversation() {
      try {
        const ctx: any = activeCtx();
        if (!ctx || !ctx.view || ctx.view.webContents.isDestroyed()) {
          return { success: false, error: 'no-ai-view' };
        }
        const { getProvider } = await import('../../providers/registry.js');
        const provider = ctx.providerId ? getProvider(ctx.providerId) : null;
        const url = provider && provider.homeUrl ? provider.homeUrl : null;
        if (!url) return { success: false, error: 'no-home-url' };
        const m: any = await import('./harness.js');
        m.prepareNewConversation(ctx);
        ctx.view.webContents.loadURL(url);
        return { success: true, url };
      } catch (e: any) {
        return { success: false, error: e && e.message ? e.message : String(e) };
      }
    },

    // ========== 导航 ==========

    goBack() {
      try {
        const ctx: any = activeCtx();
        const v = ctx && ctx.view && ctx.view.webContents;
        if (v && v.navigationHistory.canGoBack()) { v.navigationHistory.goBack(); return { success: true }; }
        return { success: false, error: 'no-back' };
      } catch (e: any) { return { success: false, error: e && e.message ? e.message : String(e) }; }
    },
    goForward() {
      try {
        const ctx: any = activeCtx();
        const v = ctx && ctx.view && ctx.view.webContents;
        if (v && v.navigationHistory.canGoForward()) { v.navigationHistory.goForward(); return { success: true }; }
        return { success: false, error: 'no-forward' };
      } catch (e: any) { return { success: false, error: e && e.message ? e.message : String(e) }; }
    },
    reload() {
      try {
        const ctx: any = activeCtx();
        const v = ctx && ctx.view && ctx.view.webContents;
        if (v) { v.reload(); return { success: true }; }
        return { success: false, error: 'no-view' };
      } catch (e: any) { return { success: false, error: e && e.message ? e.message : String(e) }; }
    },
    async goHome() {
      try {
        const ctx: any = activeCtx();
        if (!ctx || !ctx.view || ctx.view.webContents.isDestroyed()) return { success: false, error: 'no-ai-view' };
        const { getProvider } = await import('../../providers/registry.js');
        const provider = ctx.providerId ? getProvider(ctx.providerId) : null;
        const url = provider && provider.homeUrl ? provider.homeUrl : null;
        if (!url) return { success: false, error: 'no-home-url' };
        await ctx.view.webContents.loadURL(url);
        return { success: true, url };
      } catch (e: any) { return { success: false, error: e && e.message ? e.message : String(e) }; }
    },

    // ========== 壳页桥（手机端调用白名单 IPC）==========

    /**
     * 用「活跃窗口」作 sender 调用一个白名单 IPC channel。
     */
    async invoke(channel: string, args?: any) {
      if (!channel || typeof channel !== 'string') return { success: false, error: 'no-channel' };
      if (!ALLOW_SET.has(channel)) return { success: false, error: 'channel-not-allowed: ' + channel };
      try {
        const data = await invokeIpc(channel, args);
        return { success: true, data };
      } catch (e: any) {
        return { success: false, error: e && e.message ? e.message : String(e) };
      }
    },
  };
}

/** 注册控制面（幂等） */
function setupPluginControl(): void {
  if (installed) return;
  installed = true;
  (globalThis as any).__cuckooPluginControl = buildControl();
  console.log('[PluginControl] 控制面已注册');
}

/** 事件去重表：指纹 → 最近广播时间戳 */
const recentEventAt = new Map<string, number>();
const DEDUP_WINDOW_MS = 300;

/**
 * 向所有注册了 onEvent 的插件广播一个事件。
 */
function broadcastPluginEvent(payload: any): void {
  let fp = '';
  try {
    fp = String(payload.type || '') + '|' + String(payload.sessionId || '') + '|' +
      String(payload.text || '') + '|' + String(payload.code || '') + '|' +
      (payload.finished ? '1' : '0') + '|' + (payload.generating ? '1' : '0');
  } catch (_) { fp = ''; }
  if (fp) {
    const now = Date.now();
    const last = recentEventAt.get(fp);
    if (last !== undefined && now - last < DEDUP_WINDOW_MS) return;
    recentEventAt.set(fp, now);
    if (recentEventAt.size > 100) {
      for (const [k, t] of recentEventAt) {
        if (now - t > 5000) recentEventAt.delete(k);
      }
    }
  }
  try {
    const table = (globalThis as any).__cuckooPluginHostFns || {};
    for (const key of Object.keys(table)) {
      if (!key.endsWith(':onEvent')) continue;
      try { table[key](payload); } catch (_) { /* 插件报错不影响主流程 */ }
    }
  } catch (_) { /* ignore */ }
}

export { setupPluginControl, broadcastPluginEvent };
