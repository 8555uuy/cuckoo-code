/**
 * 主页（feat/022-dsh-compat-c7）
 *
 * 常用操作聚合：
 * - 新建会话（UiButton 组件）
 * - 纯净页面 / 原页面 切换（单按钮，同工具栏"净/原"逻辑）
 *
 * （插件面板入口区：将来插件可注册，暂不显示）
 */
import { createElement, useState, useEffect, useCallback } from 'react';
import { api } from '../shared.js';
import { UiButton } from '../components/ui-button.js';

/** 主页 */
export function HomePage() {
  const [harness, setHarness] = useState(false);

  useEffect(() => {
    const anyApi = api as any;
    if (anyApi.onHarnessMode) anyApi.onHarnessMode((d: any) => setHarness(!!(d && d.harness)));
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

  return createElement('div', { className: 'ck-tab ck-tab-active' },
    createElement('div', { className: 'ck-actions', style: { flexDirection: 'column', gap: 10, alignItems: 'stretch' } },
      createElement(UiButton, { icon: 'M12 5v14M5 12h14', onClick: newSession }, '新建会话'),
      // 纯净 / 原页面 切换（单按钮：同工具栏「净/原」，点击切换）
      createElement('button', {
        className: 'ck-btn ck-btn-anim ck-home-harness',
        onClick: toggleHarness,
        title: harness ? '切回原版网页' : '切换到纯净对话模式',
      }, createElement('span', null, harness ? '原页面' : '纯净页面')),
    ),
  );
}
