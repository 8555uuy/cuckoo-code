/**
 * 壳页面脚本入口。
 * 导入各模块（副作用：绑定事件），注册 tab 加载器，做预加载。
 */
import { api } from './shared.js';
import { registerTab } from './sidebar.js';
import './toolbar.js';
import './preview.js';
import './platform.js';

import { loadWorkspaces } from './pages/workspaces.js';
import { loadFiles } from './pages/files.js';
import { loadSnippets } from './pages/snippets.js';
import { loadSkills } from './pages/skills.js';
import { loadAgents } from './pages/agents.js';
import { loadMcpServers } from './pages/mcp.js';
import { loadAutoCompact } from './pages/token.js';
import { loadAbout } from './pages/about.js';
import { loadFeishu } from './pages/feishu.js';
import { renderWindowList } from './pages/windows.js';
import { loadSettings } from './pages/settings.js';
import { renderRecent } from './recent.js';
import { loadConversations } from './pages/conversations.js';
import { loadPlugins } from './pages/plugins.js';
import { initPluginShell } from './plugin-shell.js';
import { initThemePresenter } from './theme-presenter.js';
import { mountShellFrame, registerPage } from './shell-frame.js';
import { AboutPage } from './pages/about-react.js';
import { SkillsPage } from './pages/skills-react.js';
import { McpPage } from './pages/mcp-react.js';
import { SnippetsPage } from './pages/snippets-react.js';
import { ConversationsPage } from './pages/conversations-react.js';
import { TokenPage } from './pages/token-react.js';
import { FeishuPage } from './pages/feishu-react.js';
import { SettingsPage } from './pages/settings-react.js';
import { AgentsPage } from './pages/agents-react.js';
import { FilesPage } from './pages/files-react.js';
import { WindowsPage } from './pages/windows-react.js';

// 注册 tab → 加载函数（sidebar 点击时调用）
registerTab('workspaces', loadWorkspaces);
registerTab('files', loadFiles);
registerTab('snippets', loadSnippets);
registerTab('skills', loadSkills);
registerTab('agents', loadAgents);
registerTab('mcp', loadMcpServers);
registerTab('token', loadAutoCompact);
registerTab('about', loadAbout);
registerTab('feishu', loadFeishu);
registerTab('windows', renderWindowList);
registerTab('settings', loadSettings);
registerTab('conversations', loadConversations);
registerTab('plugins', loadPlugins);

// 预加载：工作区（默认页）+ 提示词 + 自动压缩配置
try { loadWorkspaces(); } catch (_) { /* ignore */ }
try { loadSnippets(); } catch (_) { /* ignore */ }
try { loadAutoCompact(); } catch (_) { /* ignore */ }

// 渲染底部状态栏「最近使用」
try { renderRecent(); } catch (_) { /* ignore */ }

// 插件界面挂载（接收主进程 shell-plugin-mount）
try { initPluginShell(); } catch (_) { /* ignore */ }

// 主题呈现层（消费主进程快照，写 --ck-* 变量）
try { initThemePresenter(); } catch (_) { /* ignore */ }

// ⚛ React 壳框架（feat/shell-react）
try {
  registerPage('about', AboutPage);
  registerPage('skills', SkillsPage);
  registerPage('mcp', McpPage);
  registerPage('snippets', SnippetsPage);
  registerPage('conversations', ConversationsPage);
  registerPage('token', TokenPage);
  registerPage('feishu', FeishuPage);
  registerPage('settings', SettingsPage);
  registerPage('agents', AgentsPage);
  registerPage('files', FilesPage);
  registerPage('windows', WindowsPage);
  mountShellFrame();
} catch (e) { console.error('[react-shell] 挂载失败', e); }

// 上报壳页面真实可视尺寸（主进程据此精确布局，避免菜单栏高度误差盖住状态栏）
function reportShellSize(): void {
  if (api.reportShellSize) api.reportShellSize(window.innerWidth, window.innerHeight);
}
reportShellSize();
window.addEventListener('resize', reportShellSize);

// 其他窗口改了提示词 → 本窗口同步刷新
if ((api as any).onSnippetsChanged) {
  (api as any).onSnippetsChanged(() => { try { loadSnippets(); } catch (_) { /* ignore */ } });
}
