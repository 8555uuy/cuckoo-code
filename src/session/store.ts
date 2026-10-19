/**
 * 会话-目录映射持久化存储 + URL 会话检测（每 profile 独立实例）
 * 由原 session-store.js 改造：从单例改为工厂函数，每个 profile 拥有独立存储文件和状态。
 */
import fs from 'node:fs';
import path from 'node:path';
import { getProviderByUrl } from '../providers/registry.js';
import type { WebId, LogicId } from './ids.js';

/** Session store 对外接口（参数用 WebId，强制调用方翻译） */
interface SessionStoreApi {
  readSessionStore(): any;
  writeSessionStore(store: any): void;
  getSessionMeta(logicId: LogicId): any;
  getProjectDirBySessionId(logicId: LogicId): any;
  saveSessionDirMapping(logicId: LogicId, projectDir: any): void;
  updateSessionTitle(logicId: LogicId, title: string): void;
  setSessionTitle(title: string): any;
  setSessionLineage(logicId: LogicId, lineage: { parentId?: string | null; kind?: string | null; agentName?: string | null }): void;
  supersedeSession(logicId: LogicId): void;
  setSessionArchived(logicId: LogicId, archived: boolean): void;
  getArchivedProjects(): string[];
  setProjectArchived(dir: string, archived: boolean): void;
  extractSessionIdFromUrl(url: string): WebId | null;
  handleUrlChange(url: string, targetView?: any): void;
  tryRestoreSessionFromUrl(targetView?: any): void;
  state: any;
}

/**
 * 创建 profile 专属的 session store 实例
 * @param profileId profile id
 * @param storeDir 存储目录（通常是 userData）
 * @param windowState window 管理模块引用
 * @param opts.noPersist 为 true 时纯内存态（子代理窗口用，不落盘）
 */
function createSessionStore(profileId: string, storeDir: string, windowState: any, opts: { noPersist?: boolean, logicIdMap?: any } = {}): SessionStoreApi {
  const STORE_FILE = path.join(storeDir, 'session-dir-map-' + profileId + '.json');
  // 子代理窗口：内存态，不读写盘（临时窗口，关了就弃）
  const noPersist = opts && opts.noPersist === true;
  let memStore: any = {};

  function readSessionStore(): any {
    if (noPersist) return memStore;
    try {
      if (fs.existsSync(STORE_FILE)) {
        return JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
      }
    } catch (err: any) {
      console.error('[Cuckoo Code] 读取会话存储失败:', err.message);
    }
    return {};
  }

  function writeSessionStore(store: any): void {
    if (noPersist) { memStore = store; return; }
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
      console.log('[Cuckoo Code] 会话存储已保存:', STORE_FILE);
    } catch (err: any) {
      console.error('[Cuckoo Code] 写入会话存储失败:', err.message);
    }
  }

  /**
   * 取会话元数据（统一为对象结构）。
   * 兼容旧格式（值直接是 projectDir 字符串）→ 归一化为 { projectDir }。
   */
  function getSessionMeta(logicId: LogicId): any {
    if (!logicId) return null;
    const store = readSessionStore();
    const v = store[logicId];
    if (v == null) return null;
    if (typeof v === 'string') return { projectDir: v, title: null, createdAt: null, updatedAt: null, archived: false, parentId: null, kind: null, agentName: null, superseded: false };
    return {
      projectDir: v.projectDir || null,
      title: v.title || null,
      createdAt: v.createdAt || null,
      updatedAt: v.updatedAt || null,
      archived: v.archived === true,
      // 血缘（子代理/压缩来源）
      parentId: v.parentId || null,
      kind: v.kind || null,
      agentName: v.agentName || null,
      superseded: v.superseded === true,
    };
  }

  function getProjectDirBySessionId(logicId: LogicId): any {
    const meta = getSessionMeta(logicId);
    return meta ? meta.projectDir : null;
  }

  /**
   * 保存/更新"会话 → 项目目录"映射。
   * 新结构：{ projectDir, title, createdAt, updatedAt }。
   * 兼容旧数据：若旧值是字符串，就地升级为对象（createdAt 保持 null，不补记时间）。
   */
  function saveSessionDirMapping(logicId: LogicId, projectDir: any): void {
    if (!logicId) return;
    const store = readSessionStore();
    const old = store[logicId];
    const now = new Date().toISOString();
    if (old == null) {
      // 新会话：记录创建/更新时间
      store[logicId] = { projectDir, title: null, createdAt: now, updatedAt: now };
    } else if (typeof old === 'string') {
      // 旧数据升级：不补记时间（老数据不记录时间）
      store[logicId] = { projectDir, title: null, createdAt: null, updatedAt: null };
    } else {
      old.projectDir = projectDir;
      // 仅"新数据"（已有 createdAt）更新时间；老数据升级来的保持无时间
      if (old.createdAt != null) old.updatedAt = now;
      store[logicId] = old;
    }
    writeSessionStore(store);
  }

  /** 项目归档：特殊 key 存在同一文件（值是目录字符串数组） */
  const PROJECT_ARCHIVES_KEY = '_archivedProjects';

  /** 取已归档的项目目录列表 */
  function getArchivedProjects(): string[] {
    const store = readSessionStore();
    const arr = store[PROJECT_ARCHIVES_KEY];
    return Array.isArray(arr) ? arr.filter((x: any) => typeof x === 'string') : [];
  }

  /** 归档/取消归档项目 */
  function setProjectArchived(dir: string, archived: boolean): void {
    if (!dir) return;
    const store = readSessionStore();
    let arr: string[] = Array.isArray(store[PROJECT_ARCHIVES_KEY]) ? store[PROJECT_ARCHIVES_KEY] : [];
    if (archived) {
      if (!arr.includes(dir)) arr.push(dir);
    } else {
      arr = arr.filter((d) => d !== dir);
    }
    store[PROJECT_ARCHIVES_KEY] = arr;
    writeSessionStore(store);
  }

  /** 归档/取消归档会话 */
  function setSessionArchived(logicId: LogicId, archived: boolean): void {
    if (!logicId) return;
    const store = readSessionStore();
    const old = store[logicId];
    if (old == null) return;
    if (typeof old === 'string') {
      store[logicId] = { projectDir: old, title: null, createdAt: null, updatedAt: null, archived: archived === true };
    } else {
      old.archived = archived === true;
      store[logicId] = old;
    }
    writeSessionStore(store);
  }

  /** 更新会话标题（AI 命名对话 / 网页标题抓取）。条目不存在时新建。 */
  function updateSessionTitle(logicId: LogicId, title: string): void {
    if (!logicId || !title) return;
    const store = readSessionStore();
    const old = store[logicId];
    const now = new Date().toISOString();
    if (old == null) {
      store[logicId] = { projectDir: state.selectedProjectDir || null, title, createdAt: now, updatedAt: now };
    } else if (typeof old === 'string') {
      // 老数据升级：不补记时间（与 saveSessionDirMapping 一致）
      store[logicId] = { projectDir: old, title, createdAt: null, updatedAt: null };
    } else {
      old.title = title;
      // 仅"新数据"更新时间；老数据升级来的保持无时间
      if (old.createdAt != null) old.updatedAt = now;
      store[logicId] = old;
    }
    writeSessionStore(store);
  }

  /**
   * 设置当前会话标题。
   * 因为新建窗口时一定会有 logicId，所以这里直接设置，不再需要 pendingTitle。
   */
  function setSessionTitle(title: string): any {
    const t = String(title || '').trim();
    if (!t) return { success: false, error: '标题为空' };
    if (state.currentSessionId) {
      updateSessionTitle(state.currentSessionId, t);
      return { success: true };
    }
    return { success: false, error: '无会话ID' };
  }

  /**
   * 设置会话血缘（子代理/压缩来源）。条目不存在时新建。
   * @param lineage { parentId, kind, agentName }（只改传入的字段）
   */
  function setSessionLineage(logicId: LogicId, lineage: { parentId?: string | null; kind?: string | null; agentName?: string | null }): void {
    if (!logicId) return;
    const store = readSessionStore();
    const now = new Date().toISOString();
    let entry: any = store[logicId];
    if (entry == null) {
      entry = { projectDir: state.selectedProjectDir || null, title: null, createdAt: now, updatedAt: now };
    } else if (typeof entry === 'string') {
      entry = { projectDir: entry, title: null, createdAt: null, updatedAt: null };
    }
    if (lineage.parentId !== undefined) entry.parentId = lineage.parentId || null;
    if (lineage.kind !== undefined) entry.kind = lineage.kind || null;
    if (lineage.agentName !== undefined) entry.agentName = lineage.agentName || null;
    store[logicId] = entry;
    // 压缩：旧版（父）标记"被取代"，不再作为当前版展示
    if (lineage.kind === 'compaction' && lineage.parentId) {
      const p = store[lineage.parentId];
      if (p && typeof p === 'object') { p.superseded = true; store[lineage.parentId] = p; }
      else if (typeof p === 'string') { store[lineage.parentId] = { projectDir: p, title: null, createdAt: null, updatedAt: null, superseded: true }; }
    }
    writeSessionStore(store);
    console.log('[Cuckoo Code][' + profileId + '] 已记血缘: ' + logicId + ' <- ' + (lineage.parentId || '?') + ' (' + (lineage.kind || '?') + ')');
  }

  /** 标记会话"已被取代"（压缩后，旧版不再作为当前版展示） */
  function supersedeSession(logicId: LogicId): void {
    if (!logicId) return;
    const store = readSessionStore();
    const old = store[logicId];
    if (old == null) return;
    if (typeof old === 'string') {
      store[logicId] = { projectDir: old, title: null, createdAt: null, updatedAt: null, superseded: true };
    } else {
      old.superseded = true;
      store[logicId] = old;
    }
    writeSessionStore(store);
    console.log('[Cuckoo Code][' + profileId + '] 已标记旧版(被取代): ' + logicId);
  }

  function extractSessionIdFromUrl(url: string): WebId | null {
    if (!url) return null;
    // 平台差异全部下沉到 provider.extractSessionId
    try {
      const provider = getProviderByUrl(url);
      if (provider && typeof provider.extractSessionId === 'function') {
        return provider.extractSessionId(url);
      }
    } catch (_) { /* provider 异常时返回 null */ }
    return null;
  }

  const state: any = {
    currentSessionId: null,
    selectedProjectDir: null,
    /** 待绑定的血缘（会话ID 出现时自动写入）：{ parentId, kind, agentName } */
    pendingLineage: null,
  };

  /** 取目标 view：显式传入优先，否则取当前主窗口的 AI 页面 view */
  function resolveView(targetView?: any): any {
    if (targetView) return targetView;
    const ctx = windowState && windowState.getMainContext ? windowState.getMainContext() : null;
    return ctx ? ctx.view : null;
  }

  /** 发"项目目录变化"：给 AI 页面 + 壳页面（地址栏） */
  function emitProjectDir(wc: any, dir: string | null): void {
    if (!wc || wc.isDestroyed()) return;
    wc.send('project-dir-updated', dir);
    try {
      const ctx = windowState && windowState.getContextByWebContents ? windowState.getContextByWebContents(wc) : null;
      if (ctx && ctx.win && !ctx.win.isDestroyed()) {
        ctx.win.webContents.send('shell-project-dir', dir);
      }
    } catch (_) { /* ignore */ }
  }

  function handleUrlChange(url: string, targetView?: any): void {
    const webId = extractSessionIdFromUrl(url);
    const view = resolveView(targetView);
    const wc = view && view.webContents ? view.webContents : null;
    const canSend = wc && !wc.isDestroyed();

    if (webId) {
      // 拿到 webId 后，通过 logicIdMap 翻译成 logicId。
      let mappedLogicId: LogicId | null = null;
      
      if (opts && opts.logicIdMap) {
        // 1) 检查这个 webId 是否已经绑定了某个 logicId（插件触发的场景）
        mappedLogicId = opts.logicIdMap.logicIdOf(webId);
        
        // 2) 如果没有，看看当前窗口是不是有一个“等待绑定”的临时 logicId
        if (!mappedLogicId && state.currentSessionId && state.currentSessionId.startsWith('local-')) {
          mappedLogicId = state.currentSessionId as LogicId;
          opts.logicIdMap.bind(mappedLogicId, webId);
        }
        
        // 3) 如果还没有（老会话或手动新建但没生成 tempId），则走 ensureLogicId
        if (!mappedLogicId) {
          mappedLogicId = opts.logicIdMap.ensureLogicId(webId);
        }
      } else {
        mappedLogicId = webId as unknown as LogicId;
      }
      
      const logicId = mappedLogicId as LogicId;
      state.currentSessionId = logicId;
      console.log('[Cuckoo Code][' + profileId + '] 当前会话ID(逻辑): ' + logicId);

      // 会话 ID 出现 → 绑定暂存的血缘（子代理/压缩来源）
      if (state.pendingLineage) {
        setSessionLineage(logicId, state.pendingLineage);
        state.pendingLineage = null;
      }
      // （pendingTitle 和 pendingProjectDir 已废弃，现在直接绑在 logicId 上）
      
      const restoredDir = getProjectDirBySessionId(logicId);
      if (restoredDir) {
        state.selectedProjectDir = restoredDir;
        if (canSend) {
          wc.send('session-restored', { sessionId: logicId, projectDir: restoredDir });
          emitProjectDir(wc, restoredDir);
        }
      } else {
        state.selectedProjectDir = null;
        if (canSend) emitProjectDir(wc, null);
      }
    } else {
      // 提取不到会话 ID（如 ChatGPT 首页 https://chatgpt.com/）：
      // 若有暂存目录（刚初始化但还没绑定会话），保留目录；否则清空（恢复原行为）。
      state.currentSessionId = null;
      if (!state.pendingProjectDir) {
        state.selectedProjectDir = null;
        if (canSend) emitProjectDir(wc, null);
      }
    }
  }

  function tryRestoreSessionFromUrl(targetView?: any): void {
    const view = resolveView(targetView);
    if (!view || !view.webContents || view.webContents.isDestroyed()) return;
    const url = view.webContents.getURL();
    handleUrlChange(url, view);
  }

  return {
    readSessionStore,
    writeSessionStore,
    getSessionMeta,
    getProjectDirBySessionId,
    saveSessionDirMapping,
    updateSessionTitle,
    setSessionTitle,
    setSessionLineage,
    supersedeSession,
    setSessionArchived,
    getArchivedProjects,
    setProjectArchived,
    extractSessionIdFromUrl,
    handleUrlChange,
    tryRestoreSessionFromUrl,
    state,
  };
}

export { createSessionStore };
