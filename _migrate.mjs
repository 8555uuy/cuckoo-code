import { installToProfile } from './out/src/plugins/profile/installer.js';
import { ensureProfile } from './out/src/plugins/profile/init.js';
import { getProfileLocalDir } from './out/src/plugins/profile/paths.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const LOG = path.join(os.homedir(), '.cuckoo', '_migrate.log');
const log = (m) => fs.appendFileSync(LOG, m + String.fromCharCode(10), 'utf-8');
fs.writeFileSync(LOG, '开始 ' + new Date().toISOString() + String.fromCharCode(10), 'utf-8');

function readJson(p) {
  let t = fs.readFileSync(p, 'utf-8');
  if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
  return JSON.parse(t);
}

const OLD = path.join(os.homedir(), '.cuckoo', 'cuckoo-plugins');
const profileDir = ensureProfile('default');

const items = [];
for (const name of fs.readdirSync(OLD)) {
  const dir = path.join(OLD, name);
  if (!fs.statSync(dir).isDirectory()) continue;
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;
  let pkg;
  try { pkg = readJson(pkgPath); } catch (e) { log('跳过 ' + name); continue; }
  const deps = Object.keys(pkg.dependencies || {});
  if (deps.length > 0 && fs.existsSync(path.join(dir, 'node_modules'))) {
    items.push({ oldDir: name, deps });
  } else if (fs.existsSync(path.join(dir, 'index.js'))) {
    items.push({ oldDir: name, local: true });
  }
}
log('待迁移: ' + JSON.stringify(items.map(p => p.oldDir)));

for (const item of items) {
  if (item.local) {
    const dest = path.join(getProfileLocalDir(profileDir), item.oldDir);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });
    for (const f of fs.readdirSync(path.join(OLD, item.oldDir))) {
      const src = path.join(OLD, item.oldDir, f);
      if (fs.statSync(src).isFile()) fs.copyFileSync(src, path.join(dest, f));
    }
    log('本地插件已复制: ' + item.oldDir);
  } else {
    for (const dep of item.deps) {
      log('装: ' + dep + ' ...');
      const r = await installToProfile(dep, 'default');
      log('  ' + (r.ok ? 'OK' : '失败: ' + r.error));
    }
  }
}
log('完成 ' + new Date().toISOString());
