const fs = require('fs');
const NL = String.fromCharCode(10);
const BASE = 'C:/d/SourceCode/2026/deepseek-harness2/packages/client/ui-primitives/src/icons';

function parseArtworks(src) {
  const lines = src.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^const (\w+Artwork)\s*=/);
    if (m) {
      let block = '';
      let j = i;
      while (j < lines.length && j < i + 400) { block += lines[j] + NL; if (lines[j].includes('</svg>')) break; j++; }
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
      // 还可能是"导出式"（export const XxxArtwork = ...）
      out.push({ name: m[1], viewBox: vb, els });
      i = j + 1; continue;
    }
    // export const XxxArtwork = ...
    const m2 = lines[i].match(/^export const (\w+Artwork)\s*=/);
    if (m2) {
      let block = ''; let j = i;
      while (j < lines.length && j < i + 400) { block += lines[j] + NL; if (lines[j].includes('</svg>')) break; j++; }
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
      out.push({ name: m2[1], viewBox: vb, els });
      i = j + 1; continue;
    }
    i++;
  }
  return out;
}

const all = {};
// index.tsx 的（含 const XxxArtwork）
for (const a of parseArtworks(fs.readFileSync(BASE + '/index.tsx', 'utf8'))) all[a.name] = a;
// shared-artwork.tsx 的（export const XxxArtwork）
for (const a of parseArtworks(fs.readFileSync(BASE + '/shared-artwork.tsx', 'utf8'))) all[a.name] = a;

const names = Object.keys(all);
console.log('总 Artwork 数: ' + names.length);
console.log('总元素数: ' + names.reduce((s, n) => s + all[n].els.length, 0));
console.log('');
console.log('=== 前 10 个 ===');
names.slice(0, 10).forEach(n => console.log(n + '  (' + all[n].els.length + ' 元素, ' + all[n].viewBox + ')'));
fs.writeFileSync('C:/d/SourceCode/2026/cuckoo-code/_artworks-all.json', JSON.stringify(all, null, 2), 'utf8');
console.log('');
console.log('✅ 已保存');
