import React, { useEffect, useRef } from 'react';
import { loadMemories } from './memories.js';
export function MemoriesReact() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = "<div class=\"ck-tab\" data-panel=\"memories\">\n  <div class=\"ck-actions\">\n    <button class=\"ck-btn ck-btn-anim\" id=\"mem-add\">\n      <svg class=\"ck-btn-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M12 5v14M5 12h14\"/></svg>\n      <span>新建记忆</span>\n    </button>\n    <input class=\"ck-input\" id=\"mem-search\" type=\"search\" placeholder=\"搜索记忆…\" style=\"flex:1;min-width:0;margin-left:8px\" />\n    <button class=\"ck-icon-btn\" id=\"mem-refresh\" title=\"刷新\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M21 12a9 9 0 1 1-2.64-6.36\"/><path d=\"M21 3v6h-6\"/></svg></button>\n  </div>\n  <p class=\"ck-about-tip\">记忆会随系统提示词发给模型。无条数/长度限制。</p>\n  <div class=\"ck-list\" id=\"mem-list\"><div class=\"ck-list-empty\">加载中…</div></div>\n</div>";
    setTimeout(() => { if (typeof loadMemories === 'function') loadMemories(); }, 50);
  }, []);
  return React.createElement('div', { ref, style: { height: '100%', overflow: 'auto', padding: '16px' } });
}