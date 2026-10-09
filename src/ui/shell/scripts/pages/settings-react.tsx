/**
 * 设置页（React 版）
 *
 * 迁移自 pages/settings.ts：
 * - 外观（主题）
 * - 失败自动重试（多字段）
 * - 发送延迟 / 附件上传间隔 / 网络安全
 * - 保存 / 恢复默认 / 刷新
 */
import { createElement, useState, useEffect, useCallback } from 'react';
import { api, ckAlert, ckConfirm } from '../shared.js';

/** 数值/文本字段 id → 设置 key（迁移自原 SET_FIELDS） */
const NUM_FIELDS: [string, string, number][] = [
  ['retry-delay-min', 'retryDelayMin', 1],
  ['retry-delay-max', 'retryDelayMax', 1],
  ['retry-count', 'retryCount', 1],
  ['retry-429-delay', 'retry429Delay', 1],
  ['retry-429-count', 'retry429Count', 1],
  ['xhr-idle-timeout', 'xhrIdleTimeout', 1],
  ['watchdog-count', 'watchdogCount', 1],
  ['send-delay-min', 'sendDelayMin', 0.1],
  ['send-delay-max', 'sendDelayMax', 0.1],
  ['attach-delay-min', 'attachDelayMin', 0.1],
  ['attach-delay-max', 'attachDelayMax', 0.1],
];
const TEXT_FIELDS: [string, string][] = [
  ['retry-prompt', 'retryPrompt'],
  ['watchdog-prompt', 'watchdogPrompt'],
];

const THEME_BUILTINS: [string, string][] = [['system', '跟随系统'], ['light', '浅色'], ['dark', '深色']];

function RefreshIcon() {
  return createElement('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    createElement('path', { d: 'M21 12a9 9 0 1 1-2.64-6.36' }), createElement('path', { d: 'M21 3v6h-6' }));
}

/** 开关行 */
function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return createElement('div', { className: 'ck-set-field ck-set-toggle' },
    createElement('span', { className: 'ck-set-key' }, label),
    createElement('label', { className: 'ck-switch' },
      createElement('input', { type: 'checkbox', checked, onChange: (e: any) => onChange(e.target.checked) }),
      createElement('span', { className: 'ck-switch-track' }),
    ),
  );
}

/** 设置页 */
export function SettingsPage() {
  const [data, setData] = useState<any>(null);
  const [themes, setThemes] = useState<[string, string][]>(THEME_BUILTINS);
  const [theme, setTheme] = useState('system');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!api.getSettings) return;
    try {
      const r = await api.getSettings();
      if (r && r.success && r.data) setData(r.data);
    } catch (_) { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  // 主题
  useEffect(() => {
    const anyApi = api as any;
    if (typeof anyApi.themeGet === 'function') {
      anyApi.themeGet().then((r: any) => {
        if (r && r.success && r.snapshot) {
          const opts: [string, string][] = THEME_BUILTINS.slice();
          for (const t of (r.snapshot.themes || [])) { if (t && t.id && t.id !== 'light' && t.id !== 'dark') opts.push([t.id, t.id]); }
          setThemes(opts);
          setTheme(r.snapshot.preference || 'system');
        }
      }).catch(() => {});
    }
  }, []);

  const onThemeChange = useCallback((v: string) => {
    setTheme(v);
    const anyApi = api as any;
    if (typeof anyApi.themeSet === 'function') anyApi.themeSet(v).catch(() => {});
  }, []);

  const setField = useCallback((key: string, v: any) => setData((d: any) => ({ ...d, [key]: v })), []);

  const save = useCallback(async () => {
    if (!api.saveSettings) return;
    setSaving(true);
    try {
      const r = await api.saveSettings(data);
      if (r && r.success) { if (r.data) setData(r.data); await ckAlert('已保存'); }
      else { await ckAlert((r && r.error) || '保存失败'); }
    } catch (e: any) { await ckAlert('保存失败: ' + (e.message || e)); }
    setSaving(false);
  }, [data]);

  const reset = useCallback(async () => {
    const anyApi = api as any;
    if (!anyApi.resetSettings) return;
    if (!(await ckConfirm('确定恢复默认设置？'))) return;
    try {
      const r = await anyApi.resetSettings();
      if (r && r.success && r.data) setData(r.data);
    } catch (_) { /* ignore */ }
  }, []);

  if (data === null) return createElement('div', { className: 'ck-tab ck-tab-active' }, createElement('div', { className: 'ck-list-empty' }, '加载中…'));

  const numVal = (key: string) => data[key] === null || data[key] === undefined ? '' : data[key];

  return createElement('div', { className: 'ck-tab ck-tab-active' },
    // 外观
    createElement('div', { className: 'ck-card' },
      createElement('div', { className: 'ck-set-group-title' }, '外观'),
      createElement('div', { className: 'ck-set-field' },
        createElement('span', { className: 'ck-set-key' }, '主题'),
        createElement('select', { className: 'ck-set-input', value: theme, onChange: (e: any) => onThemeChange(e.target.value) },
          ...themes.map(([v, label]) => createElement('option', { key: v, value: v }, label))),
      ),
    ),
    // 失败自动重试
    createElement('div', { className: 'ck-card' },
      createElement('div', { className: 'ck-set-group-title' }, '失败自动重试'),
      createElement(ToggleRow, { label: '启用自动重试', checked: data.retryEnabled !== false, onChange: (v) => setField('retryEnabled', v) }),
      createElement('div', { className: 'ck-set-field' },
        createElement('span', { className: 'ck-set-key' }, '普通失败间隔（秒）'),
        createElement('div', { className: 'ck-set-inline' },
          createElement('input', { type: 'number', className: 'ck-set-input', min: 0, step: 1, value: numVal('retryDelayMin'), onChange: (e: any) => setField('retryDelayMin', parseFloat(e.target.value) || 0) }),
          createElement('span', { className: 'ck-set-sep' }, '至'),
          createElement('input', { type: 'number', className: 'ck-set-input', min: 0, step: 1, value: numVal('retryDelayMax'), onChange: (e: any) => setField('retryDelayMax', parseFloat(e.target.value) || 0) }),
        ),
      ),
      createElement('div', { className: 'ck-set-field' }, createElement('span', { className: 'ck-set-key' }, '普通失败重试次数（负数=无限）'), createElement('input', { type: 'number', className: 'ck-set-input', step: 1, value: numVal('retryCount'), onChange: (e: any) => setField('retryCount', parseInt(e.target.value, 10) || 0) })),
      createElement('div', { className: 'ck-set-field' }, createElement('span', { className: 'ck-set-key' }, '操作频繁重试间隔（秒）'), createElement('input', { type: 'number', className: 'ck-set-input', min: 0, step: 1, value: numVal('retry429Delay'), onChange: (e: any) => setField('retry429Delay', parseFloat(e.target.value) || 0) })),
      createElement('div', { className: 'ck-set-field' }, createElement('span', { className: 'ck-set-key' }, '操作频繁重试次数（负数=无限）'), createElement('input', { type: 'number', className: 'ck-set-input', step: 1, value: numVal('retry429Count'), onChange: (e: any) => setField('retry429Count', parseInt(e.target.value, 10) || 0) })),
      createElement('div', { className: 'ck-set-field' }, createElement('span', { className: 'ck-set-key' }, '重试提示词'), createElement('textarea', { className: 'ck-set-textarea', rows: 3, value: data.retryPrompt || '', onChange: (e: any) => setField('retryPrompt', e.target.value) })),
      createElement('div', { className: 'ck-set-field' }, createElement('span', { className: 'ck-set-key' }, 'AI 回复超时后重试（秒）'), createElement('input', { type: 'number', className: 'ck-set-input', min: 0, step: 1, value: numVal('xhrIdleTimeout'), onChange: (e: any) => setField('xhrIdleTimeout', parseFloat(e.target.value) || 0) })),
      createElement('div', { className: 'ck-set-field' }, createElement('span', { className: 'ck-set-key' }, '超时重试提示词'), createElement('input', { type: 'text', className: 'ck-set-input', value: data.watchdogPrompt || '', onChange: (e: any) => setField('watchdogPrompt', e.target.value) })),
      createElement('div', { className: 'ck-set-field' }, createElement('span', { className: 'ck-set-key' }, '超时重试次数（负数=无限）'), createElement('input', { type: 'number', className: 'ck-set-input', step: 1, value: numVal('watchdogCount'), onChange: (e: any) => setField('watchdogCount', parseInt(e.target.value, 10) || 0) })),
    ),
    // 发送延迟
    createElement('div', { className: 'ck-card' },
      createElement('div', { className: 'ck-set-group-title' }, '发送延迟'),
      createElement('div', { className: 'ck-set-field' },
        createElement('span', { className: 'ck-set-key' }, '延迟区间（秒）'),
        createElement('div', { className: 'ck-set-inline' },
          createElement('input', { type: 'number', className: 'ck-set-input', min: 0, step: 0.1, value: numVal('sendDelayMin'), onChange: (e: any) => setField('sendDelayMin', parseFloat(e.target.value) || 0) }),
          createElement('span', { className: 'ck-set-sep' }, '至'),
          createElement('input', { type: 'number', className: 'ck-set-input', min: 0, step: 0.1, value: numVal('sendDelayMax'), onChange: (e: any) => setField('sendDelayMax', parseFloat(e.target.value) || 0) }),
        ),
      ),
    ),
    // 附件上传间隔
    createElement('div', { className: 'ck-card' },
      createElement('div', { className: 'ck-set-group-title' }, '附件上传间隔'),
      createElement('div', { className: 'ck-set-field' },
        createElement('span', { className: 'ck-set-key' }, '上传后检测等待（秒）'),
        createElement('div', { className: 'ck-set-inline' },
          createElement('input', { type: 'number', className: 'ck-set-input', min: 0, step: 0.1, value: numVal('attachDelayMin'), onChange: (e: any) => setField('attachDelayMin', parseFloat(e.target.value) || 0) }),
          createElement('span', { className: 'ck-set-sep' }, '至'),
          createElement('input', { type: 'number', className: 'ck-set-input', min: 0, step: 0.1, value: numVal('attachDelayMax'), onChange: (e: any) => setField('attachDelayMax', parseFloat(e.target.value) || 0) }),
        ),
      ),
    ),
    // 网络安全
    createElement('div', { className: 'ck-card' },
      createElement('div', { className: 'ck-set-group-title' }, '网络安全'),
      createElement(ToggleRow, { label: '拒绝 webFetch 访问内网/本地地址', checked: data.ssrfGuard === true, onChange: (v) => setField('ssrfGuard', v) }),
      createElement('p', { className: 'ck-about-tip' }, '开启后，webFetch 将拒绝访问内网、回环、保留地址（防 SSRF）。默认关闭（可访问本地项目）。'),
    ),
    // 操作
    createElement('div', { className: 'ck-actions' },
      createElement('button', { className: 'ck-btn ck-btn-primary', disabled: saving, onClick: save }, saving ? '保存中…' : '保存设置'),
      createElement('button', { className: 'ck-btn ck-btn-secondary', onClick: reset }, '恢复默认'),
      createElement('button', { className: 'ck-icon-btn', title: '刷新', onClick: load }, createElement(RefreshIcon)),
    ),
  );
}
