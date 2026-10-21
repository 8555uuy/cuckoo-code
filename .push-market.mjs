import fs from 'node:fs';
import path from 'node:path';

const SRC = 'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway';
const CLONE = 'D:/cuckoo-backup/ai-gateway-latest';

// 把修复后的文件复制到 clone 目录（保留 .git）
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir(SRC, CLONE);
console.log('已复制到 clone 目录');
