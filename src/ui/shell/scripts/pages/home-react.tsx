/**
 * 主页（feat/022-dsh-compat-c7）
 *
 * 常用操作聚合：
 * - 新建会话（主按钮）
 * - 纯净页面 / 原页面 切换（chip）
 *
 * （插件面板入口：将来插件可注册，暂不显示）
 */
import { createElement, useState, useEffect, useCallback } from 'react';
import { api } from '../shared.js';

function I({ d, cls }: { d: string; cls?: string }) {
  return createElement('svg', { className: cls, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, createElement('path', { d }));
}

/** 主页 */
export function HomePage() {
  const [harness, setHarness] = useState(false);
  const [projectDir, setProjectDir] = useState<string | null>(null);

  useEffect(() => {
    const anyApi = api as any;
    if (anyApi.onHarnessMode) anyApi.onHarnessMode((d: any) => setHarness(!!(d && d.harness)));
    if (api.onProjectDir) api.onProjectDir((d: string | null) => setProjectDir(d));
    if (api.getProjectDir) api.getProjectDir().then((r: any) => { if (r && r.success) setProjectDir(r.dir); }).catch(() => {});
  }, []);

  const newSession = useCallback(async () => {
    const anyApi = api as any;
    try {
      if (anyApi.newWebConversation) await anyApi.newWebConversation();
      else if (api.home) api.home();
    } catch (_) { /* ignore */ }
  }, []);

  const toggleHarness = useCallback(async () => {
    const anyApi = api as any;
    if (anyApi.toggleHarness) { try { await anyApi.toggleHarness(); } catch (_) {} }
  }, []);

  const dirName = projectDir ? String(projectDir).replace(/[\\/]+$/, '').split(/[\\/]/).pop() : '';

  return createElement('div', { className: 'ck-tab ck-tab-active ck-home' },
    // 头部：brand + 项目
    createElement('div', { className: 'ck-home-head' },
      createElement('div', { className: 'ck-home-logo' }, 'C'),
      createElement('div', { className: 'ck-home-greeting' }, '欢迎回来'),
      createElement('div', { className: 'ck-home-dir', title: projectDir || '' }, dirName ? ('项目：' + dirName) : '未选择项目'),
    ),

    // 主按钮：新建会话
    createElement('button', { className: 'ck-home-primary', onClick: newSession },
      createElement('span', { className: 'ck-home-primary-icon' }, createElement(I, { d: 'M12 5v14M5 12h14' })),
      createElement('span', { className: 'ck-home-primary-text' },
        createElement('span', { className: 'ck-home-primary-title' }, '新建会话'),
        createElement('span', { className: 'ck-home-primary-sub' }, '开始一段新的对话'),
      ),
      createElement('span', { className: 'ck-home-primary-arrow' }, createElement(I, { d: 'M9 6l6 6-6 6' })),
    ),

    // 切换模式（chip）
    createElement('div', { className: 'ck-home-section' },
      createElement('div', { className: 'ck-home-section-title' }, '对话模式'),
      createElement('button', { className: 'ck-home-mode' + (harness ? ' on' : ''), onClick: toggleHarness, title: '切换纯净对话模式' },
        createElement('span', { className: 'ck-home-mode-dot' }),
        createElement('span', null, harness ? '纯净页面' : '原页面'),
      ),
    ),
  );
}
