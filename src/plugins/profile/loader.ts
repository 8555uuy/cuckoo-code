/**
 * 从 profile 读"要加载的插件"（纯 node）
 *
 * 数据源（对齐 DSH）：
 *  - package.json 的 dependencies  → 装了哪些
 *  - cordis.patch.yml 的 disabled   → 哪些禁用
 *
 * 返回：启用的插件列表（每个含包名 + 目录）。
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  getProfileDir,
  getProfileModulesDir,
  getProfileLocalDir,
  DEFAULT_PROFILE,
} from './paths.js';
import { readProfileManifest } from './manifest.js';
import { readProfilePatch, writeProfilePatch, isDisabled, setDisabled } from './patch.js';
import { ensureProfile } from './init.js';
import { packageNameToId } from './installer.js';

export interface ProfilePluginEntry {
  /** 包名（manifest 的 dependency key） */
  name: string;
  /** 插件 id（包名转 kebab：@scope/name → scope-name） */
  id: string;
  /** 包目录（绝对路径） */
  dir: string;
  /** 是否启用（未被 patch 禁用） */
  enabled: boolean;
}

/** 找一个包在 profile 里的目录（node_modules 优先，其次 local-plugins） */
export function resolvePluginDir(profileDir: string, pkgName: string): string | null {
  // node_modules/<pkg>
  const mods = path.join(getProfileModulesDir(profileDir), pkgName);
  if (fs.existsSync(path.join(mods, 'package.json'))) return mods;
  // local-plugins/<pkg>（本地插件，如 slot-test-plugin）
  const local = path.join(getProfileLocalDir(profileDir), pkgName);
  if (fs.existsSync(path.join(local, 'package.json'))) return local;
  // local-plugins/<末段>（@scope/name → name）
  const base = pkgName.split('/').pop() || pkgName;
  const local2 = path.join(getProfileLocalDir(profileDir), base);
  if (fs.existsSync(path.join(local2, 'package.json'))) return local2;
  return null;
}

/** 列出 profile 里所有插件（含禁用状态） */
export function listProfilePluginEntries(profileName: string = DEFAULT_PROFILE): ProfilePluginEntry[] {
  const dir = ensureProfile(profileName);
  const manifest = readProfileManifest(dir, profileName);
  const patches = readProfilePatch(dir);
  const deps = manifest.dependencies || {};
  const out: ProfilePluginEntry[] = [];
  for (const name of Object.keys(deps)) {
    const id = packageNameToId(name);
    const pluginDir = resolvePluginDir(dir, name);
    if (!pluginDir) continue; // 声明了但没装（pnpm 没跑成功）
    out.push({ name, id, dir: pluginDir, enabled: !isDisabled(patches, id) && !isDisabled(patches, name) });
  }
  return out;
}

/** 只取"启用"的插件 */
export function listEnabledPlugins(profileName: string = DEFAULT_PROFILE): ProfilePluginEntry[] {
  return listProfilePluginEntries(profileName).filter((e) => e.enabled);
}

/** 设置某插件的启用/禁用（写 cordis.patch.yml） */
export function setPluginEnabledInProfile(id: string, enabled: boolean, profileName: string = DEFAULT_PROFILE): boolean {
  const dir = ensureProfile(profileName);
  const patches = readProfilePatch(dir);
  writeProfilePatch(dir, setDisabled(patches, id, !enabled));
  return true;
}
