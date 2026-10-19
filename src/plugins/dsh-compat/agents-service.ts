/**
 * DSH ctx.agents 的简化实现（C4-C）。
 *
 * DSH 的 AgentRegistry 管"活着的 agent"（get/list/roots + create）；
 * Cuckoo 没有 agent registry，但有"会话"——把会话映射成 agent 视图。
 *
 * 关键差异：
 * - DSH 的 create 是"内存组合作用域"，Cuckoo 的 create 是"登记一个 AgentSession"
 * - DSH 的 followup 进 inbox，Cuckoo 的 followup 负责"开对话 + 发消息"
 */

/** 简化 Agent 视图（DSH Agent 的核心面） */
interface CuckooAgent {
  id: string;
  session: {
    id: string;
    projectDir: string | null;
    append: (type: string, data: any) => void;
  };
  followup: (msg: any) => void;
  whenIdle: () => Promise<void>;
}

interface CuckooAgentHandle {
  agent: CuckooAgent;
  dispose: () => Promise<void>;
}

interface AgentSessionState {
  id: string;              // logicId
  webId: string | null;    // 网页 id（URL 里的）
  projectDir: string | null;
  profileId: string | null;  // 窗口 profile.id（来自 agentOptions.model）
  providerId: string | null; // 平台（来自 agentOptions.provider）
  status: 'initializing' | 'idle' | 'busy' | 'disposed';
  systemPromptSent: boolean;
  queue: Array<{ text: string; source: any }>;
}

const activeSessions = new Map<string, AgentSessionState>();
/** 等 AI 回复完成的 waiter（logicId → resolve） */
const waiters = new Map<string, () => void>();

/**
 * AI 回复完成时调用（由 harness 层在 assistant-done 时触发）。
 * 把所有 busy 的会话标记为 idle，唤醒 waiter。
 */
function onAssistantDone(): void {
  for (const [id, s] of activeSessions) {
    if (s.status === 'busy') {
      s.status = 'idle';
      const w = waiters.get(id);
      if (w) { waiters.delete(id); try { w(); } catch (_) { /* ignore */ } }
    }
  }
}

/** 由宿主会话接口构造 ctx.agents */
function createAgents(host: any): any {
  function sessionToAgent(s: { id: string; title?: string; projectDir?: string | null }): CuckooAgent {
    const state = activeSessions.get(s.id);
    if (state) {
      return {
        id: s.id,
        session: {
          id: s.id,
          projectDir: state.projectDir,
          append: (type: string, data: any) => {
            if (type === 'session/title' && data && data.title) {
              // 只能通过 setSessionTitleForId（支持 webId 为 null 时走 pending）
              if (host && host.setSessionTitleForId) {
                host.setSessionTitleForId(state.webId, data.title);
              }
            }
          },
        },
        followup: (msg: any) => {
          const text = extractText(msg);
          handleFollowup(s.id, text, msg && msg.source);
        },
        whenIdle: () => waitForIdle(s.id),
      };
    }
    // 没有活动 session（历史会话），返回只读视图
    return {
      id: s.id,
      session: { id: s.id, projectDir: (s.projectDir as string | null) ?? null, append: () => {} },
      followup: () => { throw new Error('agent is not active (use create first)'); },
      whenIdle: async () => {},
    };
  }

  function extractText(msg: any): string {
    if (!msg) return '';
    if (typeof msg.content === 'string') return msg.content;
    if (Array.isArray(msg.content)) {
      return msg.content.map((c: any) => (c && c.type === 'text' ? c.text : '')).join('');
    }
    return '';
  }

  function handleFollowup(logicId: string, text: string, source: any): void {
    const state = activeSessions.get(logicId);
    if (!state) throw new Error('session not found: ' + logicId);
    if (state.status === 'disposed') throw new Error('session disposed: ' + logicId);

    // 入队并触发处理
    state.queue.push({ text, source });
    void processQueue(logicId);
  }

  async function processQueue(logicId: string): Promise<void> {
    const state = activeSessions.get(logicId);
    if (!state || state.status === 'disposed') return;
    if (state.status === 'busy' || state.status === 'initializing') return;

    while (state.queue.length > 0) {
      const item = state.queue.shift()!;
      state.status = 'busy';

      try {
        // 1) 如果是首次，并且还没有 webId（说明是全新会话），先开对话
        if (!state.webId && !state.systemPromptSent) {
          state.status = 'initializing';
          if (host && host.navigateWindowToHome) {
            const ok = await host.navigateWindowToHome(state.id, state.profileId, state.providerId);
            if (!ok) throw new Error('no window to navigate');
          }
          // 导航内部已等 did-finish-load，这里不需要再 waitForIdle
        }

        // 2) 构造消息（首次合并系统提示词）
        let messageText = item.text;
        if (!state.systemPromptSent) {
          if (host && host.buildSystemPrompt) {
            const sysPrompt = host.buildSystemPrompt(state.projectDir || '', state.providerId || '');
            messageText = sysPrompt + '\n\n---\n\n' + item.text;
          }
          state.systemPromptSent = true;
        }

        // 3) 发送消息
        if (host && host.sendUserMessage) {
          const ok = host.sendUserMessage(state.id, state.profileId, messageText);
          if (!ok) throw new Error('send failed');
        }

        // 4) 等待 AI 回复完成（状态变 idle）
        await waitForIdle(state.id);

        // 4.5) 从当前会话拿新 webId（followup 后 URL 已变成新会话）
        try {
          if (!state.webId && host && host.getCurrentSession) {
            const cur = host.getCurrentSession();
            if (cur && cur.id) {
              state.webId = cur.id;
              if (host.logicIdMap) {
                host.logicIdMap.bind(state.id as any, cur.id as any);
              }
            }
          }
        } catch (_) { /* ignore */ }

        // 4.6) 广播 session/event.turn/end（dsh-tasks 监听这个）
        try {
          if (host && host.broadcastTurnEnd) host.broadcastTurnEnd(state.id, 'completed');
        } catch (_) { /* ignore */ }
      } catch (err: any) {
        console.error('[Cuckoo AgentSession] followup 失败:', err.message);
      } finally {
        state.status = 'idle';
      }
    }
  }

  function waitForIdle(logicId: string): Promise<void> {
    return new Promise((resolve) => {
      const s = activeSessions.get(logicId);
      if (!s || s.status === 'idle' || s.status === 'disposed') { resolve(); return; }
      waiters.set(logicId, resolve);
    });
  }

  return {
    /** 按 id 取 agent（找不到返回 undefined） */
    get(id: string): CuckooAgent | undefined {
      if (!host || !host.getSession) return undefined;
      const s = host.getSession(id);
      return s ? sessionToAgent(s) : undefined;
    },
    /** 当前 agent（当前会话） */
    current(): CuckooAgent | null {
      if (!host || !host.getCurrentSession) return null;
      const s = host.getCurrentSession();
      return s && s.id ? sessionToAgent(s) : null;
    },
    /** 所有 agent（所有会话） */
    list(): CuckooAgent[] {
      if (!host || !host.listSessions) return [];
      return host.listSessions().map(sessionToAgent);
    },
    /** 顶层 agent（简化：等同 list） */
    roots(): CuckooAgent[] {
      return this.list();
    },
    /** DSH 契约：创建 agent（只登记，不发消息） */
    async create(options: any): Promise<CuckooAgentHandle> {
      const logicId = options.sessionId;
      if (!logicId) throw new Error('create: sessionId required');
      if (activeSessions.has(logicId)) throw new Error('session already exists: ' + logicId);

      const projectDir = options.meta?.cwd || null;
      const profileId = (options.agentOptions && options.agentOptions.model) || null;
      const providerId = (options.agentOptions && options.agentOptions.provider) || null;
      const state: AgentSessionState = {
        id: logicId,
        webId: null,
        projectDir,
        profileId,
        providerId,
        status: 'idle',
        systemPromptSent: false,
        queue: [],
      };
      activeSessions.set(logicId, state);

      // 记目录（若 host 提供）
      if (projectDir && host && host.saveSessionDirMapping) {
        try { host.saveSessionDirMapping(logicId, projectDir); } catch (_) { /* ignore */ }
      }

      return {
        agent: sessionToAgent({ id: logicId, title: undefined, projectDir }),
        dispose: async () => {
          const s = activeSessions.get(logicId);
          if (s) s.status = 'disposed';
          activeSessions.delete(logicId);
        },
      };
    },
  };
}

/** 供外部更新 webId（当前流程不再需要，保留以兼容） */
function updateAgentWebId(logicId: string, webId: string): void {
  const s = activeSessions.get(logicId);
  if (s) s.webId = webId;
}

export { createAgents, updateAgentWebId, onAssistantDone };
export type { CuckooAgent };
