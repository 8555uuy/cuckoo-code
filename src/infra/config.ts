/**
 * 全局用户配置（~/.cuckoo/config.json）
 *
 * 存储跨项目、跨窗口的用户级配置。可用 CUCKOO_HOME 覆盖（测试隔离）。
 * 首次读取文件不存在时返回默认值（不写文件）。
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface UserConfig {}

const DEFAULT_CONFIG: UserConfig = {};

/** 用户级目录（可用 CUCKOO_HOME 覆盖，供测试隔离） */
function getUserDir(): string {
  const override = process.env.CUCKOO_HOME;
  return override ? override : path.join(os.homedir(), '.cuckoo');
}

function getConfigFile(): string {
  return path.join(getUserDir(), 'config.json');
}

/** 读取全局配置（文件不存在或损坏时返回默认值） */
function readConfig(): UserConfig {
  const file = getConfigFile();
  try {
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (raw && typeof raw === 'object') {
        return { ...raw };
      }
    }
  } catch (err: any) {
    console.error('[Config] 读取失败:', err.message);
  }
  return { ...DEFAULT_CONFIG };
}

/** 写入全局配置（与现有合并后整体覆盖） */
function writeConfig(cfg: Partial<UserConfig>): boolean {
  const file = getConfigFile();
  try {
    const merged = { ...readConfig(), ...cfg };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(merged, null, 2), 'utf-8');
    return true;
  } catch (err: any) {
    console.error('[Config] 写入失败:', err.message);
    return false;
  }
}

export { readConfig, writeConfig, getConfigFile };
