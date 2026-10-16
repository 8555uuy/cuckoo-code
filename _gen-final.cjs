const fs = require('fs');
const NL = String.fromCharCode(10);

const arts = JSON.parse(fs.readFileSync('C:/d/SourceCode/2026/cuckoo-code/_artworks-all.json', 'utf8'));
const exps = JSON.parse(fs.readFileSync('C:/d/SourceCode/2026/cuckoo-code/_exports.json', 'utf8'));
const libGeom = JSON.parse(fs.readFileSync('C:/d/SourceCode/2026/cuckoo-code/_lib-geom.json', 'utf8'));
const pinwheel = JSON.parse(fs.readFileSync('C:/d/SourceCode/2026/cuckoo-code/_pinwheel.json', 'utf8'));

// 1) Regular/Medium 用的 Artwork 全部装进 ART
const ART = Object.assign({}, arts);
// 2) 带尺寸后缀的直接用自己名字当 key
for (const f of libGeom) ART[f.name] = { viewBox: f.viewBox, els: f.els };
// 3) pinwheel
ART['IconPluginPinwheelOutline16'] = { viewBox: pinwheel.viewBox, els: pinwheel.els };

// 4) 生成 ART 数据
const dataLines = [];
const artNames = Object.keys(ART).sort();
for (const n of artNames) {
  const a = ART[n];
  const els = a.els.map(e => JSON.stringify([e[0], e[1]])).join(',');
  dataLines.push('  ' + JSON.stringify(n) + ': [' + JSON.stringify(a.viewBox) + ', [' + els + ']],');
}

// 5) 生成导出（去重）
const expMap = new Map();
for (const e of exps) {
  if (expMap.has(e.exportName)) continue;
  const art = e.artwork;
  const isMedium = /Medium$/.test(e.exportName);
  if (art && ART[art]) expMap.set(e.exportName, { art, stroke: isMedium ? 'STROKE_MEDIUM' : 'STROKE_REGULAR' });
  else expMap.set(e.exportName, null);
}
for (const f of libGeom) {
  if (expMap.has(f.name)) continue;
  if (ART[f.name]) expMap.set(f.name, { art: f.name, stroke: 'STROKE_REGULAR' });
}
expMap.set('IconPluginPinwheelOutline16', { art: 'IconPluginPinwheelOutline16', stroke: 'STROKE_REGULAR' });

const expLines = [];
for (const [name, info] of expMap) {
  if (info) expLines.push('export const ' + name + ' = (props: any): any => draw(' + JSON.stringify(info.art) + ', props, ' + info.stroke + ');');
  else expLines.push('export const ' + name + ' = (props: any): any => fallback(props);');
}

const lines = [];
lines.push('/**');
lines.push(' * DSH 图标兼容层（@deepseek-ai/dsh-client-ui-primitives 的 IconXxx 导出）。');
lines.push(' *');
lines.push(' * 设计：');
lines.push(' *  - 几何：提取自 DeepSeek Harness（MIT License, Copyright (c) DeepSeek）');
lines.push(' *    packages/client/ui-primitives/src/icons/{index,shared-artwork}.tsx');
lines.push(' *    与 packages/client/ui-primitives/lib/{index,types/icons/index}.js');
lines.push(' *    仅取 SVG 子元素（tag + 属性）这一图形数据，未复制其组件代码。');
lines.push(' *  - 渲染：Cuckoo 自实现（统一 currentColor 继承 / 线宽可调）。');
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
lines.push("  return createElement('svg', {");
lines.push('    width: size, height: size,');
lines.push('    className: (props && props.className) || undefined,');
lines.push("    viewBox: vb, fill: 'none', xmlns: 'http://www.w3.org/2000/svg',");
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
console.log('Artwork 数: ' + artNames.length);
console.log('导出数: ' + expLines.length);
console.log('大小: ' + fs.statSync('C:/d/SourceCode/2026/cuckoo-code/src/ui/shell/scripts/dsh-primitives/icons.tsx').size + ' 字节');
