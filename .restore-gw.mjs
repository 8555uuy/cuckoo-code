import fs from 'node:fs';
import path from 'node:path';

const CLONE = 'D:/cuckoo-backup/ai-gateway-latest';
const TARGETS = [
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway',
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway',
];

function rmrf(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { console.log('rm fail: ' + e.message); }
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name === '.git') continue;
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

for (const t of TARGETS) {
  rmrf(t);
  copyDir(CLONE, t);
  console.log('已恢复干净最新版: ' + t);
}
