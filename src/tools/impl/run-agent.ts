import { Tool } from '../core/Tool.js';
import type { ToolApiMeta } from '../core/Tool.js';
import { ToolResult } from '../core/ToolResult.js';
import { scanAgents } from '../../agents/index.js';
import { getPluginScanRoots } from '../../plugins/roots.js';

// ========== D12：API 契约元数据 ==========
export const apiMetas: ToolApiMeta[] = [
  {
    order: 14,
    category: 'Agent',
    name: 'runAgent',
    doc: '把任务委派给一个子代理（独立上下文的 AI 对话）执行，返回子代理的最终结果摘要。适合大范围搜索/分析、独立子任务，避免污染当前上下文。',
    params: 'name: string, task: string',
    returns: 'Promise<string>',
    paramDocs: {
      name: '子代理名称（见系统提示词「可用子代理」章节）',
      task: '要委派的任务描述',
    },
    returnsDoc: '子代理的最终文本结果',
    throws: '代理不存在、父窗口上下文缺失或执行超时时抛出异常',
  },
  {
    order: 15,
    category: 'Agent',
    name: 'runAgents',
    doc: '并行委派多个子代理（每个独立上下文），全部完成后按顺序返回结果。适合多个互不依赖的子任务同时推进，比逐个 runAgent 快得多。',
    params: 'tasks: { name: string, task: string }[]',
    returns: 'Promise<string>',
    paramDocs: {
      tasks: '任务数组，每项 { name: 子代理名, task: 任务描述 }',
    },
    returnsDoc: '各子代理结果的汇总文本（按输入顺序）',
    throws: 'tasks 为空或格式非法、父窗口上下文缺失时抛出异常',
  },
];

/**
 * 子代理执行器（由 app 层注入，避免 tools → app 的反向依赖）。
 * 接收 { agent, task, currentWindowId }，返回子代理最终文本。
 */
export type AgentRunner = (args: { agent: any; task: string; currentWindowId: number }) => Promise<string>;

/**
 * 判断某窗口是否子代理窗口（由 app 层注入，避免 tools → app 的反向依赖）。
 * 用于防递归：子代理窗口不能再调 runAgent。
 */
export type SubagentChecker = (windowId: number) => boolean;

let _runner: AgentRunner | null = null;
let _isSubagentWindow: SubagentChecker | null = null;

/** 由 app 层注入子代理执行实现 */
export function injectAgentRunner(fn: AgentRunner): void {
  _runner = fn;
}

/** 由 app 层注入"是否子代理窗口"判定（防递归用） */
export function injectSubagentChecker(fn: SubagentChecker): void {
  _isSubagentWindow = fn;
}

class RunAgentsTool extends Tool {
  constructor() {
    super(
      'runAgents',
      '并行委派多个子代理（各自独立上下文），全部完成后按顺序返回结果。',
      {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            description: '任务数组，每项 { name: 子代理名, task: 任务描述 }',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: '子代理名称' },
                task: { type: 'string', description: '任务描述' },
              },
              required: ['name', 'task'],
            },
          },
        },
        required: ['tasks'],
        additionalProperties: false,
      },
      'runAgents(tasks)'
    );
  }

  getPromptSection() {
    return {
      name: 'tool:runAgents',
      order: 114,
      text: '使用 runAgents(tasks) 并行委派多个子代理（tasks 是 { name, task } 数组）。适合多个互不依赖的子任务同时推进，比逐个 runAgent 快。全部完成后按顺序返回结果。',
    };
  }

  async execute(params: any): Promise<ToolResult> {
    const { tasks, projectDir, currentWindowId } = params;
    if (!Array.isArray(tasks) || tasks.length === 0) return ToolResult.error('tasks 必填且为非空数组');
    if (typeof currentWindowId !== 'number') return ToolResult.error('缺少窗口上下文');
    try {
      if (_isSubagentWindow && _isSubagentWindow(currentWindowId)) {
        return ToolResult.error('子代理不允许再调用 runAgents（防递归）');
      }
    } catch (_) { /* ignore */ }
    if (!_runner) return ToolResult.error('子代理执行器未初始化');

    const agents = scanAgents(projectDir || null, getPluginScanRoots().agentDirs);
    // 逐个校验并并行执行
    const jobs = tasks.map((t: any, i: number) => {
      const name = t && t.name;
      const task = t && t.task;
      if (!name || !task) return Promise.resolve({ index: i, name: name || '?', ok: false, text: '任务 #' + (i + 1) + ' 缺 name 或 task' });
      const agent = agents.find((a) => a.name === name);
      if (!agent) return Promise.resolve({ index: i, name, ok: false, text: '未找到子代理: ' + name });
      return _runner!({ agent, task, currentWindowId })
        .then((text) => ({ index: i, name, ok: true, text }))
        .catch((err: any) => ({ index: i, name, ok: false, text: '执行失败: ' + (err && err.message ? err.message : err) }));
    });

    const results = await Promise.all(jobs);
    results.sort((a, b) => a.index - b.index);
    const lines = results.map((r) => {
      const head = '### ' + r.name + (r.ok ? '' : '（失败）');
      return head + '\n' + r.text;
    });
    return ToolResult.success(lines.join('\n\n'));
  }
}

class RunAgentTool extends Tool {
  constructor() {
    super(
      'runAgent',
      '把任务委派给子代理（独立上下文的 AI 对话），返回结果摘要。适合大范围搜索/分析、独立子任务。',
      {
        type: 'object',
        properties: {
          name: { type: 'string', description: '子代理名称（见「可用子代理」章节）' },
          task: { type: 'string', description: '要委派的任务描述' },
        },
        required: ['name', 'task'],
        additionalProperties: false,
      },
      'runAgent(name, task)'
    );
  }

  getPromptSection() {
    return {
      name: 'tool:runAgent',
      order: 113,
      text: '使用 runAgent(name, task) 把任务委派给子代理。子代理在独立上下文中完成，只把结果摘要返回。',
    };
  }

  async execute(params: any): Promise<ToolResult> {
    const { name, task, projectDir, currentWindowId } = params;
    if (!name || !task) return ToolResult.error('name 和 task 必填');
    if (typeof currentWindowId !== 'number') return ToolResult.error('缺少窗口上下文');
    // 防递归：子代理窗口不能再调 runAgent（判定函数由 app 层注入）
    try {
      if (_isSubagentWindow && _isSubagentWindow(currentWindowId)) {
        return ToolResult.error('子代理不允许再调用 runAgent（防递归）');
      }
    } catch (_) { /* ignore */ }

    // 找代理定义（含插件贡献的代理）
    const agents = scanAgents(projectDir || null, getPluginScanRoots().agentDirs);
    const agent = agents.find((a) => a.name === name);
    if (!agent) return ToolResult.error('未找到子代理: ' + name);

    if (!_runner) return ToolResult.error('子代理执行器未初始化');

    try {
      const text = await _runner({ agent, task, currentWindowId });
      return ToolResult.success(text);
    } catch (err: any) {
      return ToolResult.error('子代理执行失败: ' + err.message);
    }
  }
}

/** JsRunner 沙箱注入 */
export function bootstrap(__call: any): void {
  (globalThis as any).runAgent = async function (name: any, task: any) {
    return await __call('runAgent', { name, task });
  };
  (globalThis as any).runAgents = async function (tasks: any) {
    return await __call('runAgents', { tasks });
  };
}

export { RunAgentTool, RunAgentsTool };
