/**
 * Profile 初始化（纯 node）
 *
 * 首次使用时创建空 profile：
 *  - package.json（默认 manifest）
 *  - cordis.patch.yml（空补丁层）
 *  - pnpm-workspace.yaml（pnpm 需要）
 *
 * 幂等：已存在则不覆盖（用户手改的不会被冲掉）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { getProfileDir, getProfileManifestPath, getProfilePatchPath, getProfileWorkspacePath, getProfileLocalDir, getUserDir, DEFAULT_PROFILE } from './paths.js';
import { defaultManifest, readProfileManifest, writeProfileManifest } from './manifest.js';
import { writeProfilePatch, readProfilePatch } from './patch.js';

/** 确保 profile 存在且结构完整（幂等）。返回 profile 目录。 */
export function ensureProfile(name: string = DEFAULT_PROFILE): string {
  const dir = getProfileDir(name);
  fs.mkdirSync(dir, { recursive: true });

  // package.json
  if (!fs.existsSync(getProfileManifestPath(dir))) {
    writeProfileManifest(dir, defaultManifest(name));
  }

  // cordis.patch.yml（空补丁层）
  if (!fs.existsSync(getProfilePatchPath(dir))) {
    writeProfilePatch(dir, []);
  }

  // pnpm-workspace.yaml（pnpm 需要这个才认"workspace 根"）
  // 内容对齐 DSH：packages: ['.'] + nodeLinker: hoisted（兼容 npm 的扁平 node_modules）
  if (!fs.existsSync(getProfileWorkspacePath(dir))) {
    const yaml = [
      '# Cuckoo profile workspace（对齐 DSH 的 pnpm-workspace.yaml）',
      'packages:',
      "  - '.'",
      '',
      '# hoisted：扁平 node_modules（Cuckoo 的加载逻辑按目录找插件，不用 pnpm 的软链）',
      'nodeLinker: hoisted',
      '# ⚠️ 不自动装 peer：DSH 插件的 peer 是 @deepseek-ai/*（宿主提供，npm 上没有）',
      '#    装它会 404 / 版本匹配失败（对齐 DSH 的配置）',
      'autoInstallPeers: false',
      '# store 固定在 ~/.cuckoo/pnpm-store（避免环境变量变化导致 store 不一致）',
      'storeDir: ' + JSON.stringify(path.join(getUserDir(), 'pnpm-store')),
      '',
      '# 需要构建的包（原生模块，对齐 DSH）',
      'allowBuilds:',
      '  cloudflared: true',
      '  cpu-features: true',
      '  ssh2: true',
      '',
    ].join(String.fromCharCode(10));
    fs.writeFileSync(getProfileWorkspacePath(dir), yaml, 'utf-8');
  }

  // local-plugins/
  fs.mkdirSync(getProfileLocalDir(dir), { recursive: true });

  return dir;
}

/** profile 是否已初始化 */
export function isProfileReady(name: string = DEFAULT_PROFILE): boolean {
  const dir = getProfileDir(name);
  return fs.existsSync(getProfileManifestPath(dir)) && fs.existsSync(getProfilePatchPath(dir));
}

/** 读 profile 状态（manifest + patch） */
export function readProfileState(name: string = DEFAULT_PROFILE): { dir: string; manifest: ReturnType<typeof readProfileManifest>; patches: ReturnType<typeof readProfilePatch> } {
  const dir = ensureProfile(name);
  return { dir, manifest: readProfileManifest(dir, name), patches: readProfilePatch(dir) };
}
