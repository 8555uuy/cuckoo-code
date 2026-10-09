/** About 页（React 版） */
import { createElement } from 'react';

export function AboutPage() {
  return createElement('div', { style: { padding: '16px' } },
    createElement('h2', { style: { margin: '0 0 12px' } }, '关于'),
    createElement('p', null, 'Cuckoo Code —— 零 Token 成本的 AI Agent 桌面应用'),
    createElement('p', { style: { color: '#888', fontSize: '12px' } }, '（React 版壳页面 · 骨架验证中）'),
  );
}
