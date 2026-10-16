const fs = require('fs');
const path = require('node:path');
const BASE = 'C:/d/SourceCode/2026/deepseek-harness2/packages/client/ui-theme/src/styles';
const OUT = 'C:/d/SourceCode/2026/cuckoo-code/src/ui/shell/styles/dsh-tokens.css';

function extractVars(src) {
  const lines = src.split(/\r?\n/);
  const out = [];
  let inVar = false; // 上一条变量声明未以 ; 结束
  for (const raw of lines) {
    const t = raw.trim();
    if (inVar) { out.push(raw); if (t.endsWith(';')) inVar = false; continue; }
    if (t === '') { out.push(''); continue; }
    if (t.endsWith('{') || t === '}' || t.startsWith('/*') || t.startsWith('*') || t.endsWith('*/')) { out.push(raw); continue; }
    if (t.startsWith('--')) { out.push(raw); if (!t.endsWith(';')) inVar = true; continue; }
    // 其他（普通属性）跳过
  }
  return out.join('\n');
}
function renameSelectors(src) {
  return src
    .replace(/body\[data-ds-dark-theme\]/g, 'body[data-ck-dark]')
    .replace(/html\[data-platform='darwin'\]/g, 'html[data-platform="darwin"]');
}
const parts = [];
for (const f of ['design-platform.css', 'base.css', 'gradient-shadow-text.css']) {
  const src = fs.readFileSync(path.join(BASE, f), 'utf8');
  parts.push('/* ===== 来源：' + f + ' ===== */');
  parts.push(renameSelectors(extractVars(src)));
  parts.push('');
}
const header = [
  '/*',
  ' * DSH 设计令牌（Design Tokens）—— 兼容层',
  ' *',
  ' * 目的：为在 Cuckoo 中运行的 DSH 插件提供它们依赖的 CSS 自定义属性',
  ' *      （--dsw-* 命名空间）。插件 CSS 用 var(--dsw-alias-label-primary) 等，',
  ' *      缺失时 fallback 到浏览器默认值 → 样式崩坏。',
  ' *',
  ' * 来源：DeepSeek Harness（MIT License, Copyright (c) DeepSeek）',
  ' *      packages/client/ui-theme/src/styles/{design-platform,base,gradient-shadow-text}.css',
  ' *      本文件仅提取"设计令牌（变量名 + 值）"数据层，选择器已适配 Cuckoo：',
  ' *        body[data-ds-dark-theme]  →  body[data-ck-dark]',
  ' *',
  ' * 许可：MIT（见 DSH LICENSE）。令牌值版权归 DeepSeek。',
  ' */',
  '',
].join('\n');
fs.writeFileSync(OUT, header + parts.join('\n') + '\n', 'utf8');
console.log('✅ 已生成 ' + OUT);
console.log('大小: ' + fs.statSync(OUT).size + ' 字节');
// 自检：关键变量在不在
const content = fs.readFileSync(OUT, 'utf8');
const must = ['--dsw-alias-label-primary:', '--dsw-alias-label-secondary:', '--dsw-alias-bg-layer-1:', '--dsw-alias-border-l1:', '--dsw-alias-brand-primary:', '--dsw-alias-button-primary-fill:', '--dsw-alias-interactive-bg-hover:', '--dsw-shadow-lv3:', '--dsw-elevation-panel:', '--dsw-font-mono:', '--dsw-font-xxxs-11:', '--dsw-font-markdown-code-block-small:', '--dsw-radius-sm:', '--dsw-static-neutral-bluish-1000:'];
for (const m of must) console.log((content.includes(m) ? '✅ ' : '❌ ') + m);
