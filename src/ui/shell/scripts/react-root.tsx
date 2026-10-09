/**
 * React 挂载点（feat/shell-react 骨架验证）
 * 先证明 React 能在壳页面跑；后续逐步把 UI 迁过来。
 */
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';

/** 测试组件：验证 React 通路 */
function ReactProbe() {
  return createElement('div', {
    style: {
      position: 'fixed', bottom: '8px', right: '8px', zIndex: 99999,
      padding: '6px 10px', borderRadius: '6px',
      background: 'rgba(139,147,255,.15)', color: '#8b93ff',
      border: '1px solid #8b93ff', font: '12px monospace',
      pointerEvents: 'none',
    },
  }, '⚛ React 已接入（骨架验证）');
}

/** 挂载 React 根（幂等） */
export function mountReactProbe(): void {
  let el = document.getElementById('ck-react-root');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ck-react-root';
    document.body.appendChild(el);
  }
  if ((el as any).__ckRoot) return;
  const root = createRoot(el);
  (el as any).__ckRoot = root;
  root.render(createElement(ReactProbe));
}
