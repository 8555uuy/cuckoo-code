import { installToProfile } from './out/src/plugins/profile/installer.js';
import { ensureProfile } from './out/src/plugins/profile/init.js';
import { getProfileLocalDir, getProfileDir, getProfileModulesDir, getProfileLockPath } from './out/src/plugins/profile/paths.js';
import { readProfileManifest, writeProfileManifest, defaultManifest } from './out/src/plugins/profile/manifest.js';
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

// ---- 清空：node_modules + lock + manifest（保留 workspace/patch/local-plugins）----
log('清空 profile...');
fs.rmSync(getProfileModulesDir(profileDir), { recursive: true, force: true });
try { fs.rmSync(getProfileLockPath(profileDir)); } catch (_) {}
writeProfileManifest(profileDir, defaultManifest('default'));

// ---- 收集旧插件 ----
const items = [];
for (const name of fs.readdirSync(OLD)) {
  const dir = path.join(OLD, name);
  if (!fs.statSync(dir).isDirectory()) continue;
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;
  let pkg;
  try { pkg = readJson(pkgPath); } catch (e) { continue; }
  const deps = Object.keys(pkg.dependencies || {});
  if (deps.length > 0 && fs.existsSync(path.join(dir, 'node_modules'))) {
    items.push({ oldDir: name, deps });
  } else if (fs.existsSync(path.join(dir, 'index.js'))) {
    items.push({ oldDir: name, local: true });
  }
}
log('待迁移: ' + JSON.stringify(items.map(p => p.oldDir)));

// ---- 逐个处理 ----
let manifest = readProfileManifest(profileDir, 'default');
for (const item of items) {
  if (item.local) {
    const dest = path.join(getProfileLocalDir(profileDir), item.oldDir);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });
    for (const f of fs.readdirSync(path.join(OLD, item.oldDir))) {
      const src = path.join(OLD, item.oldDir, f);
      if (fs.statSync(src).isFile()) fs.copyFileSync(src, path.join(dest, f));
    }
    // manifest 记录 file: 依赖 + bundles
    manifest.dependencies = manifest.dependencies || {};
    manifest.dependencies[item.oldDir] = 'file:./local-plugins/' + item.oldDir;
    manifest.dsh = manifest.dsh || {};
    manifest.dsh.profile = manifest.dsh.profile || {};
    manifest.dsh.profile.bundles = manifest.dsh.profile.bundles || [];
    if (!manifest.dsh.profile.bundles.includes(item.oldDir)) manifest.dsh.profile.bundles.push(item.oldDir);
    log('本地插件: ' + item.oldDir + '（已复制 + 记入 manifest）');
  } else {
    for (const dep of item.deps) {
      log('装: ' + dep + ' ...');
      const r = await installToProfile(dep, 'default');
      log('  ' + (r.ok ? 'OK' : '失败: ' + (r.error || '').slice(0, 200)));
      manifest = readProfileManifest(profileDir, 'default');
    }
  }
}
writeProfileManifest(profileDir, manifest);
log('完成 ' + new Date().toISOString());
