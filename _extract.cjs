const fs = require('fs');
const P = 'C:/d/SourceCode/2026/deepseek-harness2/packages/client/ui-primitives/src/icons/index.tsx';
const src = fs.readFileSync(P, 'utf8');
const NL = String.fromCharCode(10);

// 1) 按行扫描，找 Artwork 组件定义
const lines = src.split(/\r?\n/);
const artworks = [];
let i = 0;
while (i < lines.length) {
  const m = lines[i].match(/^const (\w+Artwork)\s*=/);
  if (m) {
    const name = m[1];
    // 从这行开始，收集直到 </svg> 出现
    let block = '';
    let j = i;
    while (j < lines.length && j < i + 400) {
      block += lines[j] + NL;
      if (lines[j].includes('</svg>')) break;
      j++;
    }
    // 提取 viewBox
    const vb = (block.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 16 16';
    // 提取所有子元素 <tag attr="v" ... />
    const els = [];
    const elRe = /<(path|circle|rect|line|polyline|polygon|ellipse)([^>]*?)\/?>/g;
    let em;
    while ((em = elRe.exec(block))) {
      const tag = em[1];
      const attrs = {};
      const aRe = /([\w-]+)="([^"]*)"/g;
      let am;
      while ((am = aRe.exec(em[2]))) attrs[am[1]] = am[2];
      els.push({ tag, attrs });
    }
    artworks.push({ name, viewBox: vb, els });
    i = j + 1;
    continue;
  }
  i++;
}

console.log('提取 Artwork 数: ' + artworks.length);
console.log('总元素数: ' + artworks.reduce((s, a) => s + a.els.length, 0));
fs.writeFileSync('C:/d/SourceCode/2026/cuckoo-code/_artworks.json', JSON.stringify(artworks, null, 2), 'utf8');
console.log('✅ 已保存 _artworks.json');

// 2) 提取导出映射（Artwork → Regular/Medium 导出名）
const exports2 = [];
const exportRe = /export const (Icon\w+(?:Regular|Medium)) = \(props[^)]*\) => \(([\s\S]*?)\)\n\n/g;
// 简化：按行找
for (let k = 0; k < lines.length; k++) {
  const em = lines[k].match(/^export const (Icon\w+(Regular|Medium)) = /);
  if (em) {
    // 看下面几行，找它用的是哪个 Artwork
    const chunk = lines.slice(k, k + 4).join(' ');
    const ref = (chunk.match(/(\w+Artwork)/) || [])[1];
    exports2.push({ exportName: em[1], artwork: ref || null });
  }
}
console.log('导出映射数: ' + exports2.length);
fs.writeFileSync('C:/d/SourceCode/2026/cuckoo-code/_exports.json', JSON.stringify(exports2, null, 2), 'utf8');
console.log('✅ 已保存 _exports.json');
console.log('');
console.log('=== 前 5 个导出 ===');
exports2.slice(0, 5).forEach(e => console.log(e.exportName + ' ← ' + e.artwork));
