/**
 * 下载/准备 MCP 运行时二进制（uv + node）
 *
 * 背景：MCP server 常用 `uvx`（Python）或 `npx`（Node）启动，但用户机器
 * 不一定装了 uv/node。此脚本在构建/开发时下载对应平台的二进制到
 * resources/runtime/<platform>/bin/，打包后由 MCP spawn 时优先使用（不碰用户系统）。
 *
 * 幂等：已安装且版本一致时跳过。
 * 用法：node scripts/fetch-runtime.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const RUNTIME_DIR = path.join(ROOT, 'resources', 'runtime');
const TMP_DIR = path.join(RUNTIME_DIR, '.tmp');

const VERSIONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'runtime-versions.json'), 'utf-8'));

function currentPlatform() {
  const p = process.platform;
  const a = process.arch;
  if (p === 'win32' && a === 'x64') return 'win-x64';
  if (p === 'darwin' && a === 'x64') return 'mac-x64';
  if (p === 'darwin' && a === 'arm64') return 'mac-arm64';
  throw new Error('不支持的平台: ' + p + '-' + a);
}

function uvAsset(platform) {
  const map = {
    'win-x64': 'uv-x86_64-pc-windows-msvc.zip',
    'mac-x64': 'uv-x86_64-apple-darwin.tar.gz',
    'mac-arm64': 'uv-aarch64-apple-darwin.tar.gz',
  };
  return map[platform];
}

function nodeAsset(platform) {
  const v = VERSIONS.node;
  const map = {
    'win-x64': 'node-' + v + '-win-x64.zip',
    'mac-x64': 'node-' + v + '-darwin-x64.tar.gz',
    'mac-arm64': 'node-' + v + '-darwin-arm64.tar.gz',
  };
  return map[platform];
}

function download(url, dest) {
  console.log('[runtime] 下载 ' + url);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  execSync('curl -L --fail --silent --show-error -o "' + dest + '" "' + url + '"', { stdio: 'inherit' });
}

function extract(archive, dest) {
  fs.mkdirSync(dest, { recursive: true });
  if (archive.endsWith('.zip')) {
    execSync('tar -xf "' + archive + '" -C "' + dest + '"', { stdio: 'inherit' });
  } else if (archive.endsWith('.tar.gz') || archive.endsWith('.tgz')) {
    execSync('tar -xzf "' + archive + '" -C "' + dest + '"', { stdio: 'inherit' });
  } else {
    throw new Error('不支持的压缩格式: ' + archive);
  }
}

function installedMarker(platform) {
  return path.join(RUNTIME_DIR, platform, '.installed.json');
}

/** uv/node 是否已就位（不因 pnpm 缺失而重装） */
function isUpToDate(platform) {
  try {
    const marker = JSON.parse(fs.readFileSync(installedMarker(platform), 'utf-8'));
    return marker.uv === VERSIONS.uv && marker.node === VERSIONS.node;
  } catch {
    return false;
  }
}

/** pnpm 目录（跨平台共享，纯 JS） */
const PNPM_DIR = path.join(RUNTIME_DIR, 'pnpm');

/** pnpm 已就位且版本一致？ */
function isPnpmUpToDate() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(PNPM_DIR, 'package.json'), 'utf-8'));
    return pkg.version === VERSIONS.pnpm;
  } catch {
    return false;
  }
}

/** 下载 pnpm（tarball → 解压 → 拷进 resources/runtime/pnpm/） */
function fetchPnpm() {
  if (isPnpmUpToDate()) {
    console.log('[runtime] pnpm ' + VERSIONS.pnpm + ' 已就位，跳过');
    return;
  }
  console.log('[runtime] 准备 pnpm ' + VERSIONS.pnpm + '...');
  const assetName = 'pnpm-' + VERSIONS.pnpm + '.tgz';
  const url = 'https://registry.npmmirror.com/pnpm/-/' + assetName;
  const archive = path.join(TMP_DIR, assetName);
  download(url, archive);
  const extractDir = path.join(TMP_DIR, 'pnpm');
  extract(archive, extractDir);
  // npm tarball 解压后是 package/ 子目录
  const inner = fs.readdirSync(extractDir).map((n) => path.join(extractDir, n))
    .find((p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } });
  const srcDir = inner || extractDir;
  fs.rmSync(PNPM_DIR, { recursive: true, force: true });
  fs.mkdirSync(PNPM_DIR, { recursive: true });
  copyDir(srcDir, PNPM_DIR);
  console.log('[runtime] pnpm 就位 → ' + PNPM_DIR);
}

/** 把 srcDir 下的所有文件复制到 destDir */
function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, ent.name);
    const d = path.join(destDir, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function chmodExec(dir) {
  // macOS/Linux 需要可执行位
  if (process.platform === 'win32') return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) chmodExec(p);
    else {
      try { fs.chmodSync(p, 0o755); } catch {}
    }
  }
}

function main() {
  const platform = currentPlatform();
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });

  // ---- uv + node（按平台；已就位则跳过）----
  if (isUpToDate(platform)) {
    console.log('[runtime] ' + platform + ' uv/node 已是最新（uv ' + VERSIONS.uv + ', node ' + VERSIONS.node + '），跳过');
  } else {
    console.log('[runtime] 准备 ' + platform + ' 运行时...');
    const binDir = path.join(RUNTIME_DIR, platform, 'bin');
    fs.rmSync(binDir, { recursive: true, force: true });
    fs.mkdirSync(binDir, { recursive: true });

    // uv
    const uvAssetName = uvAsset(platform);
    const uvUrl = 'https://github.com/astral-sh/uv/releases/download/' + VERSIONS.uv + '/' + uvAssetName;
    const uvArchive = path.join(TMP_DIR, uvAssetName);
    download(uvUrl, uvArchive);
    const uvExtract = path.join(TMP_DIR, 'uv');
    extract(uvArchive, uvExtract);
    copyDir(uvExtract, binDir);

    // node
    const nodeAssetName = nodeAsset(platform);
    const nodeUrl = 'https://nodejs.org/dist/' + VERSIONS.node + '/' + nodeAssetName;
    const nodeArchive = path.join(TMP_DIR, nodeAssetName);
    download(nodeUrl, nodeArchive);
    const nodeExtract = path.join(TMP_DIR, 'node');
    extract(nodeArchive, nodeExtract);
    const nodeInner = fs.readdirSync(nodeExtract).map(n => path.join(nodeExtract, n)).find(p => fs.statSync(p).isDirectory());
    copyDir(nodeInner || nodeExtract, binDir);

    chmodExec(binDir);

    fs.writeFileSync(installedMarker(platform), JSON.stringify({
      uv: VERSIONS.uv, node: VERSIONS.node, installedAt: new Date().toISOString(),
    }, null, 2));

    console.log('[runtime] 完成 → ' + binDir);
    console.log('[runtime] 内容: ' + fs.readdirSync(binDir).join(', '));
  }

  // ---- pnpm（跨平台共享，纯 JS）----
  fetchPnpm();

  fs.rmSync(TMP_DIR, { recursive: true, force: true });
}

main();
