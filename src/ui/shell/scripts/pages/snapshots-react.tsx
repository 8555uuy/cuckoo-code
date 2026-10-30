import React, { useEffect, useRef } from 'react';
import { loadSnapshots } from './snapshots.js';
export function SnapshotsReact() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = "<div class=\"ck-tab\" data-panel=\"snapshots\">\n  <div class=\"ck-actions\">\n    <button class=\"ck-btn ck-btn-anim\" id=\"snap-create\">新建快照</button>\n    <button class=\"ck-icon-btn\" id=\"snap-refresh\" title=\"刷新\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M21 12a9 9 0 1 1-2.64-6.36\"/><path d=\"M21 3v6h-6\"/></svg></button>\n  </div>\n  <p class=\"ck-about-tip\">快照会在恢复前自动创建回滚备份，防止数据丢失。</p>\n  <div class=\"ck-list\" id=\"snap-list\"><div class=\"ck-list-empty\">加载中…</div></div>\n</div>";
    setTimeout(() => { if (typeof loadSnapshots === 'function') loadSnapshots(); }, 50);
  }, []);
  return React.createElement('div', { ref, style: { height: '100%', overflow: 'auto', padding: '16px' } });
}