import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/cuckoo-code/src';
const files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|html)$/.test(e.name)) files.push(p);
  }
}
walk(ROOT);

// 收集全部内容
const contents = {};
for (const f of files) {
  try { contents[f] = fs.readFileSync(f, 'utf8'); } catch (_) {}
}

// 所有 .ts（非 .d.ts、非 index.ts）
const tsFiles = files.filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts') && path.basename(f) !== 'index.ts');

const orphans = [];
for (const f of tsFiles) {
  const base = path.basename(f, '.ts');
  const re = new RegExp('(?:/|\'|")' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\.js|\'|"|/index\\.js)');
  let found = false;
  for (const [k, v] of Object.entries(contents)) {
    if (k === f) continue;
    if (re.test(v)) { found = true; break; }
  }
  if (!found) orphans.push(f.replace('D:/cuckoo-code/', ''));
}
console.log('疑似无引用的 .ts 文件: ' + orphans.length);
orphans.forEach(o => console.log('  ' + o));
