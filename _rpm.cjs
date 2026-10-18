const fs = require('fs');
const path = require('node:path');
const BASE = 'C:/d/SourceCode/2026/deepseek-harness2';
// 找 readPluginMeta 定义
function walk(d, depth) {
  if (depth > 6) return [];
  let out = []; let ents;
  try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch (_) { return []; }
  for (const e of ents) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
    const fp = path.join(d, e.name);
    if (e.isDirectory()) out = out.concat(walk(fp, depth + 1));
    else if (/\.ts$/.test(e.name)) out.push(fp);
  }
  return out;
}
for (const f of walk(BASE + '/packages', 0)) {
  const s = fs.readFileSync(f, 'utf8');
  if (s.includes('function readPluginMeta') || s.includes('export function readPluginMeta')) {
    console.log('=== ' + f.replace(BASE, '') + ' ===');
    const lines = s.split(String.fromCharCode(10));
    const idx = lines.findIndex(l => l.includes('function readPluginMeta'));
    if (idx >= 0) for (let j = Math.max(0, idx-5); j < idx + 60; j++) console.log((j+1) + ': ' + (lines[j]||'').slice(0, 150));
  }
}
console.log('（扫完）');
