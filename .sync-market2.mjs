import fs from 'node:fs';
import path from 'node:path';
const SRC = 'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway';
const DST = 'D:/cuckoo-backup/ai-gateway-latest';
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
copyDir(SRC, DST);
console.log('已同步到市场仓库目录');
