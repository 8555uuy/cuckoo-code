/**
 * 子代理运行器（主进程侧编排）
 *
 * 流程：创建子代理窗口 → 等加载 → 导航到新对话 → 注入提示词+任务
 *      → 等子代理回复完成（无工具调用）→ 取最终文本 → 关闭窗口 → 返回
 *
 * 依赖注入：createWindow / profileManager 由 entry.ts 注入，避免循环依赖。
 */
import * as windowState from './window.js';

type CreateWindowFn = (profile: any) => number;

let _createWindow: CreateWindowFn | null = null;
let _profileManager: any = null;

/** 由 entry.ts 注入依赖 */
export function injectSubagentDeps(deps: { createWindow: CreateWindowFn; profileManager: any }): void {
  _createWindow = deps.createWindow;
  _profileManager = deps.profileManager;
}

/** 等待子代理完成的回调注册表：windowId → resolve */
const pending = new Map<number, (text: string) => void>();

/** 每个 profile 正在跑的子代理数量（用于飞书消息拦截等） */
const runningByProfile = new Map<string, number>();

/** ===== 运行中子代理注册表（供壳页面展示进度）===== */
export interface RunningSubagent {
  windowId: number;
  parentWindowId: number;
  agentName: string;
  task: string;
  startedAt: number;
  status: 'starting' | 'running' | 'done' | 'error';
  turn: number;
  preview: string;
  error?: string;
}
const runningSubagents = new Map<number, RunningSubagent>();

/** 注册一个刚开始的子代理 */
function registerRunning(info: { windowId: number; parentWindowId: number; agentName: string; task: string }): void {
  runningSubagents.set(info.windowId, {
    windowId: info.windowId,
    parentWindowId: info.parentWindowId,
    agentName: info.agentName,
    task: info.task,
    startedAt: Date.now(),
    status: 'starting',
    turn: 0,
    preview: '',
  });
  notifyParent(info.parentWindowId);
}

/** 更新运行中子代理的状态（进度/轮次/预览） */
function updateRunning(windowId: number, patch: Partial<RunningSubagent>): void {
  const cur = runningSubagents.get(windowId);
  if (!cur) return;
  Object.assign(cur, patch);
  notifyParent(cur.parentWindowId);
}

/** 移除（结束） */
function removeRunning(windowId: number): void {
  const cur = runningSubagents.get(windowId);
  if (!cur) return;
  runningSubagents.delete(windowId);
  notifyParent(cur.parentWindowId);
}

/** 列出某父窗口下的运行中子代理 */
function listRunning(parentWindowId?: number): RunningSubagent[] {
  const all = Array.from(runningSubagents.values());
  const list = parentWindowId ? all.filter((s) => s.parentWindowId === parentWindowId) : all;
  return list.sort((a, b) => a.startedAt - b.startedAt);
}

/** 通知父窗口壳页面刷新（静默，失败忽略） */
function notifyParent(parentWindowId: number): void {
  try {
    const ctx = windowState.getWindowContext(parentWindowId);
    if (ctx && ctx.win && !ctx.win.isDestroyed()) {
      ctx.win.webContents.send('shell-subagents-changed');
    }
  } catch (_) { /* ignore */ }
}

/** 该 profile 是否有子代理正在运行 */
export function hasRunningSubagent(profileId: string): boolean {
  return !!profileId && (runningByProfile.get(profileId) || 0) > 0;
}

export { listRunning, updateRunning };

function incRunning(profileId: string): void {
  if (!profileId) return;
  runningByProfile.set(profileId, (runningByProfile.get(profileId) || 0) + 1);
}
function decRunning(profileId: string): void {
  if (!profileId) return;
  const n = (runningByProfile.get(profileId) || 0) - 1;
  if (n <= 0) runningByProfile.delete(profileId);
  else runningByProfile.set(profileId, n);
}

/** bridge 侧检测到子代理完成时调用（IPC 入口） */
export function onSubagentResponse(windowId: number, text: string): void {
  const resolve = pending.get(windowId);
  if (resolve) {
    pending.delete(windowId);
    resolve(text || '');
  }
}

/** 等子代理回复完成（超时兜底） */
function waitForDone(windowId: number, timeoutMs: number): Promise<string> {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      pending.delete(windowId);
      resolve('__SUBAGENT_TIMEOUT__');
    }, timeoutMs);
    pending.set(windowId, (text) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(text);
    });
  });
}

/**
 * 运行一个子代理。
 * @param parentProfileId 父窗口 profile id（决定 partition）
 * @param agentName 代理名
 * @param task 任务描述
 * @param systemPrompt 代理系统提示（正文）
 * @param tools 允许的工具（可选，空=全部）
 * @param timeoutMs 超时
 * @returns 子代理最终文本
 */
export async function runAgent(opts: {
  parentProfileId: string;
  parentWindowId: number;
  agentName: string;
  task: string;
  systemPrompt: string;
  tools?: string[];
  maxTurns?: number;
  timeoutMs?: number;
}): Promise<string> {
  if (!_createWindow || !_profileManager) throw new Error('子代理依赖未注入');
  const timeoutMs = opts.timeoutMs || 600000; // 默认 10 分钟

  // 取父窗口的项目目录 + providerId（用于构建工具系统提示）
  const parentCtx = windowState.getWindowContext(opts.parentWindowId);
  const parentStore = parentCtx ? parentCtx.sessionStore : null;
  const projectDir = parentStore ? parentStore.state.selectedProjectDir : null;
  const providerId = (parentCtx && parentCtx.providerId) || 'deepseek';
  // 父会话 ID（发起子代理的那个对话；为 null 时血缘记不了）
  const parentSessionId = (parentStore && parentStore.state && parentStore.state.currentSessionId) || null;

  // 创建子代理窗口（复用父 partition）
  const parent = _profileManager.getProfileById(opts.parentProfileId);
  if (!parent) throw new Error('父 profile 不存在: ' + opts.parentProfileId);
  const subProfile = _profileManager.createSubagentProfile(parent, opts.agentName);
  subProfile.subagentConfig = {
    agentName: opts.agentName,
    task: opts.task,
    systemPrompt: opts.systemPrompt,
    tools: opts.tools || null,
    maxTurns: opts.maxTurns || null,
    projectDir: projectDir || null, // 传给子代理窗口，供 overlay 显示"当前项目目录"
  };
  console.log('[子代理] 启动 ' + opts.agentName + ' (父窗口 ' + opts.parentWindowId + ', 项目目录 ' + (projectDir || '无') + ')');
  incRunning(opts.parentProfileId);
  const windowId = _createWindow(subProfile);
  registerRunning({ windowId, parentWindowId: opts.parentWindowId, agentName: opts.agentName, task: opts.task });

  // 关键：把父窗口的项目目录写入子代理窗口的 sessionStore，
  // 否则子代理执行工具（execute-js 从 ctx.sessionStore.state.selectedProjectDir 取）
  // 时 projectDir 为 null，相对路径/初始化状态都会错。
  try {
    const subCtx = windowState.getWindowContext(windowId);
    if (subCtx && subCtx.sessionStore) {
      if (projectDir) subCtx.sessionStore.state.selectedProjectDir = projectDir;
      // 血缘：子代理对话 -> 父对话（会话 ID 出现时自动绑定）
      if (parentSessionId) {
        subCtx.sessionStore.state.pendingLineage = { parentId: parentSessionId, kind: 'subagent', agentName: opts.agentName };
      }
    }
  } catch (_) { /* ignore */ }

  // 提示词由子代理窗口自己调 initProject 生成（复用初始化流程）
  try {
    const text = await waitForDone(windowId, timeoutMs);
    if (text === '__SUBAGENT_TIMEOUT__') throw new Error('子代理执行超时');
    updateRunning(windowId, { status: 'done', preview: (text || '').slice(0, 200) });
    return text;
  } catch (err: any) {
    updateRunning(windowId, { status: 'error', error: err && err.message ? err.message : String(err) });
    throw err;
  } finally {
    decRunning(opts.parentProfileId);
    removeRunning(windowId);
    // 关闭子代理窗口
    // 用 destroy()：close() 在隐藏窗口上可能不生效（实测窗口会堆积、最终资源耗尽）
    try {
      const ctx = windowState.getWindowContext(windowId);
      if (ctx && ctx.win && !ctx.win.isDestroyed()) {
        try { ctx.win.destroy(); }
        catch (e1) { try { ctx.win.close(); } catch (e2) { /* ignore */ } }
      }
    } catch (_) { /* ignore */ }
    // 通知父窗口刷新工作区列表（子代理的会话/血缘已写入账本）
    try {
      const parentCtx = windowState.getWindowContext(opts.parentWindowId);
      if (parentCtx && parentCtx.win && !parentCtx.win.isDestroyed()) {
        parentCtx.win.webContents.send('shell-sessions-changed');
      }
    } catch (_) { /* ignore */ }
  }
}

// ========== 网关：隐藏窗口问答（供 ai-gateway 插件调用）==========
//
// 为什么不让网关直接借用用户的活动窗口：
//   1) 会污染用户正在进行的对话；
//   2) 工具调用轮会与用户对话的事件流搅在一起，捕获不到"最终回复"；
//   3) 用户手动停止/切换会话会打断外部请求。
// 因此网关走"独立隐藏窗口"——与子代理同款：复用父 partition 免登录，
// 有完整 Cuckoo 系统提示词（含全部工具），工具循环天然正常。

/** 网关流式回调表：windowId → 回调（收到该窗口流式进度时调用） */
const gatewayStreams = new Map<number, (chunk: any) => void>();

/** 当前并发中的网关窗口数（防请求洪水把内存吃光） */
let gatewayActive = 0;
const GATEWAY_MAX_CONCURRENT = 3;

/** 取某窗口的网关流式回调（IPC 层用） */
export function getGatewayStream(windowId: number): ((chunk: any) => void) | undefined {
  return gatewayStreams.get(windowId);
}

/**
 * 在独立隐藏窗口里跑一次问答（不污染用户窗口；工具循环天然正常）。
 * 与 runAgent 的区别：不写血缘、不注入子代理提示词、支持流式回调。
 */
export async function runGatewayQuery(opts: {
  text: string;
  parentWindowId: number;
  onChunk?: (chunk: { think?: string; text?: string; done?: boolean }) => void;
  timeoutMs?: number; // 保留原行尾
  /** B 模式：不注入 Cuckoo 提示词，平台原生回复 */
  noCuckooPrompt?: boolean;
  /** B 模式工具拦截：发现代码块立刻上报，不执行本地工具 */
  interceptTools?: boolean;
}): Promise<{ ok: boolean; text?: string; error?: string }> {
  if (!_createWindow || !_profileManager) return { ok: false, error: '子代理依赖未注入' };
  if (gatewayActive >= GATEWAY_MAX_CONCURRENT) {
    return { ok: false, error: '网关繁忙（并发已达上限 ' + GATEWAY_MAX_CONCURRENT + '），请稍后重试' };
  }
  const parentCtx = windowState.getWindowContext(opts.parentWindowId);
  if (!parentCtx) return { ok: false, error: '父窗口不存在' };
  const parent = _profileManager.getProfileById(parentCtx.profileId);
  if (!parent) return { ok: false, error: '父 profile 不存在' };
  const projectDir = parentCtx.sessionStore ? parentCtx.sessionStore.state.selectedProjectDir : null;

  const subProfile = _profileManager.createSubagentProfile(parent, 'gateway');
  subProfile.subagentConfig = {
    agentName: 'gateway',
    task: opts.text,
    systemPrompt: '',
    tools: null,
    maxTurns: null,
    projectDir: projectDir || null,
    isGateway: true, // 纯用户消息（不加"任务"框架），让 AI 自由用工具
    noCuckooPrompt: opts.noCuckooPrompt === true,
    interceptTools: opts.interceptTools === true,
  };
  gatewayActive++;
  const windowId = _createWindow(subProfile);
  if (opts.onChunk) gatewayStreams.set(windowId, opts.onChunk);
  const timeoutMs = opts.timeoutMs || 300000;
  let hardTimer: any = null;
  try {
    const text = await Promise.race([
      waitForDone(windowId, timeoutMs),
      // 硬超时：waitForDone 之外再加一层，保证无论怎样都会往下走（finally 里强制销毁窗口）
      new Promise((resolve) => { hardTimer = setTimeout(() => resolve('__GATEWAY_HARD_TIMEOUT__'), timeoutMs + 8000); }),
    ]);
    if (text === '__SUBAGENT_TIMEOUT__' || text === '__GATEWAY_HARD_TIMEOUT__') {
      return { ok: false, error: '等待回复超时' };
    }
    return { ok: true, text: String(text) };
  } catch (err: any) {
    return { ok: false, error: (err && err.message) ? err.message : String(err) };
  } finally {
    if (hardTimer) { try { clearTimeout(hardTimer); } catch (_) {} }
    gatewayActive = Math.max(0, gatewayActive - 1);
    gatewayStreams.delete(windowId);
    // 强制销毁：close() 在隐藏窗口上可能不生效（实测窗口堆积、最终资源耗尽）
    try {
      const ctx = windowState.getWindowContext(windowId);
      if (ctx && ctx.win && !ctx.win.isDestroyed()) {
        try { ctx.win.destroy(); }
        catch (e1) { try { ctx.win.close(); } catch (e2) { /* ignore */ } }
      }
    } catch (_) { /* ignore */ }
  }
}
