/**
 * React 版壳框架（feat/shell-react）
 *
 * React 接管整个侧栏（活动栏 + 面板），旧的原生结构隐藏。
 * 逐页面迁移：每迁一个，注册一个页面组件。
 *
 * 复用现有 CSS class（.ck-activitybar / .ck-panel / .ck-panel-body / .ck-ab-item）。
 */
import { createElement, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './shared.js';

/** 展开侧栏（若收起）：从 localStorage 恢复宽度，并通知主进程重排 */
function expandSidebar(): void {
  const sidebar = document.getElementById('ck-sidebar');
  if (!sidebar || !sidebar.classList.contains('ck-collapsed')) return;
  sidebar.classList.remove('ck-collapsed');
  let w = 320;
  try { const v = Number(localStorage.getItem('cuckoo-sidebar-width')); if (Number.isFinite(v) && v >= 320) w = Math.round(v); } catch (_) {}
  sidebar.style.width = w + 'px';
  try { if (api.toggleSidebar) api.toggleSidebar(w); } catch (_) {}
}

/** 活动栏 tab 定义 */
interface TabDef { id: string; title: string; icon: string | { text: string }; }

const TABS: TabDef[] = [
  { id: 'workspaces', title: '工作区（会话）', icon: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  { id: 'files', title: '项目文件', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6' },
  { id: 'snippets', title: '提示词', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
  { id: 'skills', title: '技能', icon: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
  { id: 'plugins', title: '插件', icon: 'M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v3.8h1.5a2.2 2.2 0 0 1 0 4.4H2V19a2 2 0 0 0 2 2h3.8v-1.5a2.2 2.2 0 0 1 4.4 0V21H18a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z' },
  { id: 'agents', title: '子代理', icon: 'M3 8h18v12H3zM12 8V4' },
  { id: 'mcp', title: 'MCP（连接器）', icon: 'M9 12h6M8 7H7a5 5 0 0 0 0 10h1M16 7h1a5 5 0 0 1 0 10h-1' },
  { id: 'windows', title: '窗口', icon: 'M3 3h18v18H3zM3 9h18M9 21V9' },
  { id: 'token', title: 'Token（词元）', icon: { text: '元' } },
];

const BOTTOM_TABS: TabDef[] = [
  { id: 'about', title: '关于', icon: 'M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0M12 16v-4M12 8h.01' },
  { id: 'feishu', title: '飞书同步（手机）', icon: 'M5 2h14v20H5zM11 18h2' },
  { id: 'settings', title: '设置', icon: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0' },
];

/** 页面组件表 */
const PAGES: Record<string, () => any> = {};

/** 注册页面组件 */
export function registerPage(id: string, comp: () => any): void { PAGES[id] = comp; }

/** 图标 */
function Icon({ icon }: { icon: TabDef['icon'] }) {
  if (typeof icon === 'object' && 'text' in icon) return createElement('span', { className: 'ck-ab-text' }, icon.text);
  return createElement('svg', { className: 'ck-ab-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, createElement('path', { d: icon }));
}

/** 活动栏按钮 */
function AbButton({ tab, active, onClick }: { tab: TabDef; active: boolean; onClick: () => void }) {
  return createElement('button', { className: 'ck-ab-item' + (active ? ' ck-ab-active' : ''), title: tab.title, onClick }, createElement(Icon, { icon: tab.icon }));
}

/** 主框架 */
function ShellFrame() {
  const [activeTab, setActiveTab] = useState('about');
  const Page = useMemo(() => PAGES[activeTab], [activeTab]);
  const onTabClick = (id: string) => { expandSidebar(); setActiveTab(id); };
  return createElement('div', { style: { display: 'contents' } },
    createElement('div', { className: 'ck-activitybar' },
      TABS.map((t) => createElement(AbButton, { key: t.id, tab: t, active: activeTab === t.id, onClick: () => onTabClick(t.id) })),
      createElement('div', { className: 'ck-ab-spacer' }),
      BOTTOM_TABS.map((t) => createElement(AbButton, { key: t.id, tab: t, active: activeTab === t.id, onClick: () => onTabClick(t.id) })),
    ),
    createElement('div', { className: 'ck-panel' },
      createElement('div', { className: 'ck-panel-body' },
        Page ? createElement(Page) : createElement('div', { style: { padding: 12, color: '#888' } }, '页面「' + activeTab + '」尚未重写'),
      ),
    ),
  );
}

/** 挂载（幂等）：React 接管整个侧栏，旧的原生结构整体隐藏 */
export function mountShellFrame(): void {
  const sidebar = document.getElementById('ck-sidebar');
  if (!sidebar) return;
  // 1) 把旧的原生结构整体包起来隐藏
  if (!sidebar.dataset.ckOldWrapped) {
    const wrap = document.createElement('div');
    wrap.id = 'ck-old-shell';
    wrap.style.display = 'none';
    while (sidebar.firstChild) wrap.appendChild(sidebar.firstChild);
    sidebar.appendChild(wrap);
    sidebar.dataset.ckOldWrapped = '1';
  }
  // 2) React 挂载点
  let host = document.getElementById('ck-shell-react');
  if (!host) {
    host = document.createElement('div');
    host.id = 'ck-shell-react';
    host.style.cssText = 'display:contents;';
    sidebar.appendChild(host);
  }
  if ((host as any).__root) return;
  const root = createRoot(host);
  (host as any).__root = root;
  root.render(createElement(ShellFrame));
}
