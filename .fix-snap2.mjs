import fs from 'node:fs';
const p = 'D:/cuckoo-code/src/app/snapshots.ts';
let s = fs.readFileSync(p, 'utf8');
const NL = String.fromCharCode(10);

// ===== 1. 在 EXCLUDE_DIRS 定义前插入上限常量 =====
const anchor1 = 'const EXCLUDE_DIRS = new Set([';
if (s.includes(anchor1) && !s.includes('MAX_SNAPSHOT_BYTES')) {
  s = s.replace(anchor1, [
    '/** 单次快照体积上限（默认 512MB）：超过直接报错，避免几 GB 快照写爆磁盘 */',
    'const MAX_SNAPSHOT_BYTES = Number(process.env.CUCKOO_SNAPSHOT_MAX_MB || 512) * 1024 * 1024;',
    '',
    anchor1,
  ].join(NL));
  console.log('1 OK 常量');
}

// ===== 2. 替换整个 collectFiles 函数 =====
function replaceFunction(src, fnName, newBody) {
  const startRe = new RegExp('function ' + fnName + '\\s*\\([^)]*\\)\\s*:[^{]*\\{');
  const m = src.match(startRe);
  if (!m) return { ok: false, src };
  const start = m.index;
  const bodyStart = start + m[0].length;
  // 从 bodyStart 开始数大括号深度
  let depth = 1;
  let i = bodyStart;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === "'") { i++; while (i < src.length && src[i] !== "'") { if (src[i] === '\\\\') i++; i++; } }
    else if (ch === '"') { i++; while (i < src.length && src[i] !== '"') { if (src[i] === '\\\\') i++; i++; } }
    else if (ch === '\'') { i++; while (i < src.length && src[i] !== '\'') { if (src[i] === '\\\\') i++; i++; } }
    i++;
  }
  if (depth !== 0) return { ok: false, src };
  const end = i;
  return { ok: true, src: src.slice(0, start) + newBody + src.slice(end) };
}

const newCollect = [
  '/**',
  ' * 递归收集 projectDir 下需要快照的文件（绝对路径列表），跳过排除目录与符号链接。',
  ' * 同时累加总大小；超过 MAX_SNAPSHOT_BYTES 时抛错（避免生成超大快照）。',
  ' */',
  'function collectFiles(root: string, checkLimit: boolean = true): string[] {',
  '  const result: string[] = [];',
  '  let total = 0;',
  '  const walk = (dir: string): void => {',
  '    let entries: fs.Dirent[];',
  '    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }',
  '    for (const ent of entries) {',
  '      if (ent.isSymbolicLink()) continue;',
  '      if (ent.isDirectory()) {',
  '        if (EXCLUDE_DIRS.has(ent.name)) continue;',
  '        walk(path.join(dir, ent.name));',
  '      } else if (ent.isFile()) {',
  '        if (isExcludedFile(ent.name)) continue;',
  '        const abs = path.join(dir, ent.name);',
  '        try { total += fs.statSync(abs).size; } catch (_) { /* ignore */ }',
  '        if (checkLimit && total > MAX_SNAPSHOT_BYTES) {',
  "          throw new Error('快照体积超过上限 ' + Math.round(MAX_SNAPSHOT_BYTES / 1024 / 1024) + 'MB（可通过环境变量 CUCKOO_SNAPSHOT_MAX_MB 调整）。已扫描 ' + result.length + ' 个文件');",
  '        }',
  '        result.push(abs);',
  '      }',
  '    }',
  '  };',
  '  walk(root);',
  '  return result;',
  '}',
].join(NL);

const r1 = replaceFunction(s, 'collectFiles', newCollect);
if (r1.ok) { s = r1.src; console.log('2 OK collectFiles'); }
else { console.log('2 MISS collectFiles'); }

// ===== 3. 替换整个 restoreSnapshot 函数 =====
const newRestore = [
  '/**',
  ' * 恢复快照。',
  ' * 安全措施：',
  ' *  1. 恢复前自动创建「回滚快照」，失败时提示用哪个 id 回退；',
  ' *  2. 覆盖过程中出错则抛错并带上回滚快照 id；',
  ' *  3. 返回被覆盖的文件数 + 回滚快照 id，供 UI 展示。',
  ' */',
  'function restoreSnapshot(id: string): { restored: number; projectDir: string; rollbackId: string | null } {',
  '  const meta = getSnapshot(id);',
  "  if (!meta) throw new Error('快照不存在: ' + id);",
  "  const filesDir = path.join(getSnapshotDir(id), 'files');",
  "  if (!fs.existsSync(filesDir)) throw new Error('快照文件目录缺失: ' + id);",
  '  if (!fs.existsSync(meta.projectDir)) {',
  "    throw new Error('原项目目录已不存在，无法恢复: ' + meta.projectDir);",
  '  }',
  '',
  '  // 恢复前先自动创建回滚快照',
  '  let rollbackId: string | null = null;',
  '  try {',
  "    const rb = createSnapshot(meta.projectDir, '恢复前自动备份 ' + new Date().toLocaleString(), 'restore ' + id + ' 之前的状态');",
  '    rollbackId = rb.id;',
  "    console.log('[Snapshots] 已创建回滚快照:', rollbackId);",
  '  } catch (e: any) {',
  "    console.warn('[Snapshots] 回滚快照创建失败（继续恢复）:', e && e.message);",
  '  }',
  '',
  '  const projectRoot = path.resolve(meta.projectDir);',
  '  let restored = 0;',
  '  const walk = (dir: string): void => {',
  '    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {',
  '      const src = path.join(dir, ent.name);',
  '      if (ent.isDirectory()) { walk(src); continue; }',
  '      if (!ent.isFile()) continue;',
  '      const rel = path.relative(filesDir, src);',
  '      const dest = path.resolve(projectRoot, rel);',
  '      if (dest !== projectRoot && !dest.startsWith(projectRoot + path.sep)) {',
  "        console.warn('[Snapshots] 跳过越界路径:', dest);",
  '        continue;',
  '      }',
  '      try {',
  '        fs.mkdirSync(path.dirname(dest), { recursive: true });',
  '        fs.copyFileSync(src, dest);',
  '        restored++;',
  '      } catch (e: any) {',
  "        console.error('[Snapshots] 恢复单个文件失败:', dest, e && e.message);",
  "        throw new Error('恢复中断于 ' + rel + ': ' + (e && e.message) + (rollbackId ? '（可用回滚快照 ' + rollbackId + ' 还原）' : ''));",
  '      }',
  '    }',
  '  };',
  '  walk(filesDir);',
  "  console.log('[Snapshots] 已恢复:', id, restored + ' 个文件');",
  '  return { restored, projectDir: meta.projectDir, rollbackId };',
  '}',
].join(NL);

const r2 = replaceFunction(s, 'restoreSnapshot', newRestore);
if (r2.ok) { s = r2.src; console.log('3 OK restoreSnapshot'); }
else { console.log('3 MISS restoreSnapshot'); }

fs.writeFileSync(p, s, 'utf8');
console.log('done');
