const fs = require('fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const os = require('node:os');

const tmp = path.join(os.tmpdir(), 'dshmarket-dl-' + Date.now());
fs.mkdirSync(tmp, { recursive: true });
const tgz = path.join(tmp, 'pkg.tgz');
console.log('下载 dshmarket@1.66.37 ...');
(async () => {
  const res = await fetch('https://registry.npmjs.org/dshmarket/-/dshmarket-1.66.37.tgz');
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(tgz, buf);
  console.log('✅ 下载完成: ' + Math.round(buf.length / 1024) + ' KB');
  // 解压
  execSync('tar -xzf "' + tgz + '" -C "' + tmp + '"', { stdio: 'inherit' });
  const pkgDir = path.join(tmp, 'package');
  console.log('');
  console.log('=== 解压后结构 ===');
  const walk = (d, depth, prefix) => {
    if (depth > 2) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const fp = path.join(d, e.name);
      if (e.isDirectory()) {
        console.log(prefix + e.name + '/');
        walk(fp, depth + 1, prefix + '  ');
      } else {
        console.log(prefix + e.name + '  (' + Math.round(fs.statSync(fp).size / 1024) + ' KB)');
      }
    }
  };
  walk(pkgDir, 0, '');
  // 统计总大小
  let total = 0, count = 0;
  const walkSize = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const fp = path.join(d, e.name); if (e.isDirectory()) walkSize(fp); else { total += fs.statSync(fp).size; count++; } } };
  walkSize(pkgDir);
  console.log('');
  console.log('总大小: ' + Math.round(total / 1024) + ' KB (' + count + ' 文件)');
  fs.writeFileSync('C:/d/SourceCode/2026/cuckoo-code/_dl-tmp.txt', tmp, 'utf8');
})();
