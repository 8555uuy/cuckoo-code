/**
 * 项目文件页（React 版）
 *
 * 迁移自 pages/files.ts：
 * - 文件树（递归，展开/折叠）
 * - 搜索（扁平过滤 + 高亮）
 * - @ 按钮
 * - 预览面板（骨架保留 id，交给 preview.js/Monaco 操作）
 */
import { createElement, useState, useEffect, useCallback, useRef, memo } from 'react';
import { api } from '../shared.js';

interface TreeNode { name: string; path: string; type: 'dir' | 'file'; children?: TreeNode[] }

const CARET = 'M6 3l5 5-5 5';
const FOLDER = 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z';
const FILE = 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6';
const IMG = 'M3 3h18v18H3zM8.5 8.5h.01M21 15l-5-5L5 21';

const EXT_COLOR: Record<string, string> = {
  ts: 'ts', tsx: 'ts', mts: 'ts', cts: 'ts', js: 'js', jsx: 'js', mjs: 'js', cjs: 'js',
  json: 'json', json5: 'json', md: 'md', markdown: 'md', mdx: 'md',
  css: 'css', scss: 'css', less: 'css', sass: 'css', html: 'html', htm: 'html', vue: 'html', svelte: 'html',
  py: 'py', pyw: 'py', java: 'java', kt: 'java', kts: 'java', go: 'go', rs: 'rs', rb: 'rb', php: 'php',
  c: 'c', h: 'c', cc: 'c', cpp: 'c', hpp: 'c', cxx: 'c', cs: 'cs',
  sh: 'sh', bash: 'sh', zsh: 'sh', bat: 'sh', cmd: 'sh', ps1: 'sh',
  yml: 'yml', yaml: 'yml', toml: 'yml', ini: 'yml', conf: 'yml', env: 'yml',
  xml: 'xml', svg: 'xml', sql: 'sql',
  png: 'img', jpg: 'img', jpeg: 'img', gif: 'img', webp: 'img', bmp: 'img', ico: 'img', avif: 'img', mp4: 'img', mp3: 'img', wav: 'img', mov: 'img', webm: 'img',
  txt: 'txt', log: 'txt', text: 'txt', lock: 'lock',
};
const EXT_BADGE: Record<string, string> = {
  ts: 'TS', tsx: 'TS', mts: 'TS', cts: 'TS', js: 'JS', jsx: 'JS', mjs: 'JS', cjs: 'JS',
  json: '{}', json5: '{}', md: 'MD', markdown: 'MD', mdx: 'MD',
  css: 'CSS', scss: 'CSS', less: 'CSS', sass: 'CSS', html: '<>', htm: '<>', vue: 'VUE', svelte: 'SVE',
  py: 'PY', pyw: 'PY', java: 'JV', kt: 'KT', kts: 'KT', go: 'GO', rs: 'RS', rb: 'RB', php: 'PHP',
  c: 'C', h: 'H', cc: 'C+', cpp: 'C+', hpp: 'C+', cxx: 'C+', cs: 'C#',
  sh: '>_', bash: '>_', zsh: '>_', bat: '>_', cmd: '>_', ps1: '>_',
  yml: 'YML', yaml: 'YML', toml: 'TML', ini: 'INI', conf: 'CFG', env: 'ENV',
  xml: 'XML', svg: 'SVG', sql: 'SQL', txt: 'TXT', log: 'LOG', text: 'TXT', lock: 'LCK',
};
const MEDIA_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'avif', 'mp4', 'mp3', 'wav', 'mov', 'webm']);

function extOf(name: string): string { const dot = name.lastIndexOf('.'); return dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''; }
function colorCls(name: string, type: 'dir' | 'file'): string {
  if (type === 'dir') return '';
  const ext = extOf(name);
  return EXT_COLOR[ext] ? 'ck-ft-c-' + EXT_COLOR[ext] : 'ck-ft-c-file';
}

/** 文件/目录图标 */
function FIcon({ name, type }: { name: string; type: 'dir' | 'file' }) {
  const svg = (d: string, extra: string) => createElement('span', { className: 'ck-ft-icon ' + extra }, createElement('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }, createElement('path', { d })));
  if (type === 'dir') return svg(FOLDER, 'ck-ft-i-dir');
  const ext = extOf(name);
  if (MEDIA_EXTS.has(ext)) return svg(IMG, 'ck-ft-i-media');
  const badge = EXT_BADGE[ext];
  if (badge) return createElement('span', { className: 'ck-ft-icon ck-ft-badge ' + colorCls(name, 'file') }, badge);
  return svg(FILE, 'ck-ft-i-file');
}

/** @ 按钮 */
function AtBtn({ path }: { path: string }) {
  return createElement('span', { className: 'ck-ft-at', title: '追加 @' + path + ' 到输入框', onClick: async (e: any) => { e.stopPropagation(); if (api.appendSnippet) { try { await api.appendSnippet('@' + path); } catch (_) {} } } }, '@');
}

/** 高亮 */
function Highlight({ text, kw }: { text: string; kw: string }) {
  if (!kw) return createElement('span', null, text);
  const low = text.toLowerCase(); const k = kw.toLowerCase();
  const idx = low.indexOf(k);
  if (idx < 0) return createElement('span', null, text);
  return createElement('span', null, text.slice(0, idx), createElement('mark', { className: 'ck-ft-hl' }, text.slice(idx, idx + kw.length)), text.slice(idx + kw.length));
}

/** 树节点渲染 */
function TreeNodes({ nodes, depth, expanded, onToggle, onFile }: { nodes: TreeNode[]; depth: number; expanded: Set<string>; onToggle: (p: string) => void; onFile: (p: string) => void }): any {
  return createElement('div', { style: { display: 'contents' } },
    nodes.map((n) => {
      const pad = 6 + depth * 14;
      if (n.type === 'dir') {
        const open = expanded.has(n.path);
        return createElement('div', { key: n.path, style: { display: 'contents' } },
          createElement('div', { className: 'ck-ft-row ck-ft-dir' + (open ? ' open' : ''), style: { paddingLeft: pad }, onClick: () => onToggle(n.path) },
            createElement('span', { className: 'ck-ft-caret' }, createElement('svg', { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, createElement('path', { d: CARET }))),
            createElement(FIcon, { name: n.name, type: 'dir' }),
            createElement('span', { className: 'ck-ft-name' }, n.name),
            createElement(AtBtn, { path: n.path }),
          ),
          open && n.children ? createElement(TreeNodes, { nodes: n.children, depth: depth + 1, expanded, onToggle, onFile }) : null,
        );
      }
      return createElement('div', { key: n.path, className: 'ck-ft-row ck-ft-file', title: n.path, style: { paddingLeft: pad }, onClick: () => onFile(n.path) },
        createElement('span', { className: 'ck-ft-caret' }),
        createElement(FIcon, { name: n.name, type: 'file' }),
        createElement('span', { className: 'ck-ft-name ' + colorCls(n.name, 'file') }, n.name),
        createElement(AtBtn, { path: n.path }),
      );
    }),
  );
}

function flatten(nodes: TreeNode[], out: TreeNode[]): TreeNode[] { for (const n of nodes) { out.push(n); if (n.children) flatten(n.children, out); } return out; }

/** 预览面板（静态骨架，交给 preview.js/Monaco；memo 确保 React 不重渲染它） */
const PreviewPane = memo(function PreviewPane() {
  return createElement('div', { className: 'ck-preview-pane', id: 'ck-preview-pane' },
    createElement('div', { className: 'ck-preview-head' },
      createElement('span', { className: 'ck-preview-name', id: 'ck-preview-name' }, '文件预览'),
      createElement('span', { className: 'ck-preview-size', id: 'ck-preview-size' }),
      createElement('span', { className: 'ck-preview-acts' },
        createElement('span', { className: 'ck-preview-btn', id: 'ck-preview-ext', title: '用系统程序打开' }, '↗'),
        createElement('span', { className: 'ck-preview-btn', id: 'ck-preview-close', title: '关闭预览' }, '✕'),
      ),
    ),
    createElement('div', { className: 'ck-preview-body', id: 'ck-preview-body' },
      createElement('div', { className: 'ck-preview-empty', id: 'ck-preview-empty' }, '点击左侧文件查看内容'),
      createElement('div', { className: 'ck-monaco', id: 'ck-monaco', style: { display: 'none' } }),
    ),
  );
});

function RefreshIcon() {
  return createElement('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, createElement('path', { d: 'M21 12a9 9 0 1 1-2.64-6.36' }), createElement('path', { d: 'M21 3v6h-6' }));
}

/** 项目文件页 */
export function FilesPage() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [root, setRoot] = useState('项目文件');
  const [kw, setKw] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [truncated, setTruncated] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!api.listProjectTree) return;
    try {
      const r: any = await api.listProjectTree();
      if (!r || !r.success) { setErr((r && r.error) || '加载失败'); return; }
      setErr(null);
      if (r.root) setRoot(String(r.root).replace(/[\\/]+$/, '').split(/[\\/]/).pop() || '项目文件');
      setTree(r.tree || []);
      setTruncated(!!r.truncated);
    } catch (_) { setErr('加载失败'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // 项目目录变化 → 刷新
  useEffect(() => {
    if (api.onProjectDir) api.onProjectDir(() => { setExpanded(new Set()); load(); });
  }, [load]);

  const onToggle = useCallback((p: string) => { setExpanded((s) => { const n = new Set(s); if (n.has(p)) n.delete(p); else n.add(p); return n; }); }, []);
  const onFile = useCallback(async (p: string) => { try { const { openPreview } = await import('../preview.js'); await openPreview(p); } catch (_) {} }, []);

  // 搜索过滤
  let body;
  if (err) body = createElement('div', { className: 'ck-list-empty' }, err);
  else if (kw) {
    const all = flatten(tree, []);
    const low = kw.toLowerCase();
    const matched = all.filter((n) => n.path.toLowerCase().includes(low));
    if (matched.length === 0) body = createElement('div', { className: 'ck-list-empty' }, '无匹配结果');
    else {
      matched.sort((a, b) => a.type !== b.type ? (a.type === 'file' ? -1 : 1) : a.path.localeCompare(b.path));
      const shown = matched.slice(0, 500);
      body = createElement('div', { style: { display: 'contents' } },
        shown.map((n) => createElement('div', { key: n.path, className: 'ck-ft-row ' + (n.type === 'dir' ? 'ck-ft-dir' : 'ck-ft-file'), title: n.path, onClick: n.type === 'file' ? () => onFile(n.path) : () => onToggle(n.path) },
          createElement(FIcon, { name: n.name, type: n.type }),
          createElement('span', { className: 'ck-ft-name ' + colorCls(n.name, n.type) }, createElement(Highlight, { text: n.name, kw })),
          createElement('span', { className: 'ck-ft-path' }, createElement(Highlight, { text: n.path, kw })),
          createElement(AtBtn, { path: n.path }),
        )),
        matched.length > 500 ? createElement('div', { className: 'ck-ft-truncated' }, '（结果过多，仅显示前 500 项）') : null,
      );
    }
  } else if (tree.length === 0) body = createElement('div', { className: 'ck-list-empty' }, '空目录');
  else body = createElement('div', { style: { display: 'contents' } },
    createElement(TreeNodes, { nodes: tree, depth: 0, expanded, onToggle, onFile }),
    truncated ? createElement('div', { className: 'ck-ft-truncated' }, '（节点过多，已截断显示）') : null,
  );

  return createElement('div', { className: 'ck-tab ck-tab-active' },
    createElement('div', { className: 'ck-actions' },
      createElement('span', { className: 'ck-set-group-title', style: { flex: 1 } }, root),
      createElement('button', { className: 'ck-icon-btn', title: '刷新', onClick: load }, createElement(RefreshIcon)),
    ),
    createElement('div', { className: 'ck-ft-search' },
      createElement('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, createElement('circle', { cx: 11, cy: 11, r: 7 }), createElement('path', { d: 'M21 21l-4-4' })),
      createElement('input', { className: 'ck-ft-search-input', placeholder: '搜索文件名…', spellCheck: false, autoComplete: 'off', value: kw, onChange: (e: any) => setKw(e.target.value) }),
    ),
    createElement('div', { className: 'ck-files-cols' },
      createElement('div', { className: 'ck-list ck-ft', id: 'ft-list' }, body),
      createElement(PreviewPane),
    ),
  );
}
