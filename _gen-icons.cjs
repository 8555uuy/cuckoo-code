const fs = require('fs');
const NL = String.fromCharCode(10);

const arts = JSON.parse(fs.readFileSync('C:/d/SourceCode/2026/cuckoo-code/_artworks-all.json', 'utf8'));
const exps = JSON.parse(fs.readFileSync('C:/d/SourceCode/2026/cuckoo-code/_exports.json', 'utf8'));

function parseOne(src, name) {
  const lines = src.split(/\r?\n/);
  const idx = lines.findIndex(l => l.includes('const ' + name));
  if (idx < 0) return null;
  let block = ''; let j = idx;
  while (j < lines.length && j < idx + 400) { block += lines[j] + NL; if (lines[j].includes('</svg>')) break; j++; }
  const vb = (block.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 16 16';
  const els = [];
  const elRe = /<(path|circle|rect|line|polyline|polygon|ellipse)([^>]*?)\/?>/g;
  let em;
  while ((em = elRe.exec(block))) {
    const attrs = {};
    const aRe = /([\w-]+)="([^"]*)"/g;
    let am;
    while ((am = aRe.exec(em[2]))) attrs[am[1]] = am[2];
    els.push({ tag: em[1], attrs });
  }
  return { name, viewBox: vb, els };
}
const DSHSRC = fs.readFileSync('C:/d/SourceCode/2026/deepseek-harness2/packages/client/ui-primitives/src/icons/index.tsx', 'utf8');
for (const n of ['IconChecklistOutlineArtwork', 'IconCompactOutlineArtwork']) {
  if (!arts[n]) { const a = parseOne(DSHSRC, n); if (a) arts[n] = a; }
}

const dataLines = [];
const names = Object.keys(arts).sort();
for (const n of names) {
  const a = arts[n];
  const els = a.els.map(e => JSON.stringify([e.tag, e.attrs])).join(',');
  dataLines.push('  ' + JSON.stringify(n) + ': [' + JSON.stringify(a.viewBox) + ', [' + els + ']],');
}

const expLines = [];
const seen = new Set();
for (const e of exps) {
  if (seen.has(e.exportName)) continue;
  seen.add(e.exportName);
  const art = e.artwork;
  const isMedium = /Medium$/.test(e.exportName);
  const strokeConst = isMedium ? 'STROKE_MEDIUM' : 'STROKE_REGULAR';
  if (art && arts[art]) {
    expLines.push('export const ' + e.exportName + ' = (props: any): any => draw(' + JSON.stringify(art) + ', props, ' + strokeConst + ');');
  } else {
    expLines.push('export const ' + e.exportName + ' = (props: any): any => fallback(props);');
  }
}

const lines = [];
lines.push('/**');
lines.push(' * DSH 图标兼容层（@deepseek-ai/dsh-client-ui-primitives 的 IconXxx 导出）。');
lines.push(' *');
lines.push(' * 设计：');
lines.push(' *  - 几何：提取自 DeepSeek Harness（MIT License, Copyright (c) DeepSeek）');
lines.push(' *    packages/client/ui-primitives/src/icons/{index,shared-artwork}.tsx');
lines.push(' *    仅取 SVG 子元素（tag + 属性）这一图形数据，未复制其组件代码。');
lines.push(' *  - 渲染：Cuckoo 自实现（统一 viewBox / currentColor 继承 / 线宽可调）。');
lines.push(' *');
lines.push(' * 每个导出必须是具名常量：DSH 插件经 __toESM(require(...)) 包装，');
lines.push(' * 它按 Object.getOwnPropertyNames 遍历——Proxy / 动态对象骗不过。');
lines.push(' */');
lines.push("import { createElement } from 'react';");
lines.push('');
lines.push('/** 常规线宽（对齐 DSH ICON_REGULAR_STROKE） */');
lines.push('const STROKE_REGULAR = 1;');
lines.push('/** 强调线宽（对齐 DSH ICON_MEDIUM_STROKE） */');
lines.push('const STROKE_MEDIUM = 1.3;');
lines.push('');
lines.push('/** 几何数据：名称 → [viewBox, [子元素…]] */');
lines.push('const ART: Record<string, [string, any[][]]> = {');
for (const d of dataLines) lines.push(d);
lines.push('};');
lines.push('');
lines.push('/** 兜底图标（几何缺失时）：圆角方块，保证不崩 */');
lines.push('function fallback(props: any): any {');
lines.push('  const size = (props && props.size) || 16;');
lines.push("  return createElement('svg', {");
lines.push("    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',");
lines.push("    stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',");
lines.push("    className: (props && props.className) || undefined, 'aria-hidden': true,");
lines.push("  }, createElement('rect', { x: 4, y: 4, width: 16, height: 16, rx: 3 }));");
lines.push('}');
lines.push('');
lines.push('/** 按几何数据渲染 SVG（Cuckoo 自实现渲染器） */');
lines.push('function draw(name: string, props: any, strokeWidth: number): any {');
lines.push('  const art = ART[name];');
lines.push('  if (!art) return fallback(props);');
lines.push('  const vb = art[0]; const els = art[1];');
lines.push('  const size = (props && props.size) || 16;');
lines.push('  const children = els.map((e: any, i: number) => createElement(e[0], Object.assign({ key: i }, e[1])));');
lines.push('  return createElement(' + JSON.stringify('svg') + ', {');
lines.push('    width: size, height: size,');
lines.push('    className: (props && props.className) || undefined,');
lines.push('    viewBox: vb, fill: ' + JSON.stringify('none') + ', xmlns: ' + JSON.stringify('http://www.w3.org/2000/svg') + ',');
lines.push("    'aria-hidden': true, strokeWidth,");
lines.push('  }, ...children);');
lines.push('}');
lines.push('');
lines.push('// ===== 导出（' + expLines.length + ' 个具名常量）=====');
for (const e of expLines) lines.push(e);
lines.push('');
const out = lines.join(NL);

fs.writeFileSync('C:/d/SourceCode/2026/cuckoo-code/src/ui/shell/scripts/dsh-primitives/icons.tsx', out, 'utf8');
console.log('✅ 已生成 icons.tsx');
console.log('Artwork 数: ' + names.length);
console.log('导出数: ' + expLines.length);
console.log('大小: ' + fs.statSync('C:/d/SourceCode/2026/cuckoo-code/src/ui/shell/scripts/dsh-primitives/icons.tsx').size + ' 字节');
