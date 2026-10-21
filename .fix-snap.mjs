import fs from 'node:fs';
const p = 'D:/cuckoo-code/src/app/snapshots.ts';
const L = fs.readFileSync(p, 'utf8').split(String.fromCharCode(10));
const applied = [];

// ===== 1. 常量：快照体积上限 =====
let idx = -1;
for (let i = 0; i < L.length; i++) {
  if (L[i].includes('const EXCLUDE_DIRS = new Set([')) { idx = i; break; }
}
if (idx > 0 && !L.some(l => l.includes('MAX_SNAPSHOT_BYTES'))) {
  L.splice(idx, 0,
    '/** 单次快照体积上限（默认 512MB）：超过直接报错，避免几 GB 快照写爆磁盘 */',
    'const MAX_SNAPSHOT_BYTES = Number(process.env.CUCKOO_SNAPSHOT_MAX_MB || 512) * 1024 * 1024;',
    ''
  );
  applied.push('体积上限常量');
}

// ===== 2. collectFiles 同时累加大小（改成返回 {files, totalBytes}） =====
// 找到 collectFiles 函数体替换
let cStart = -1, cEnd = -1;
for (let i = 0; i < L.length; i++) {
  if (L[i].includes('function collectFiles(root: string): string[]')) { cStart = i; break; }
}
if (cStart >= 0) {
  for (let i = cStart; i < L.length; i++) {
    if (L[i].trim() === '}') { cEnd = i; break; }
  }
}
if (cStart >= 0 && cEnd > cStart) {
  const body = [
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
    '        try { total += fs.statSync(abs).size; } catch (_) { /* 单个文件取大小失败忽略 */ }',
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
  ];
  L.splice(cStart, cEnd - cStart + 1, ...body);
  applied.push('collectFiles 体积检查');
}

// ===== 3. restoreSnapshot：恢复前自动备份 + 失败回滚 =====
let rStart = -1, rEnd = -1;
for (let i = 0; i < L.length; i++) {
  if (L[i].includes('function restoreSnapshot(id: string)')) { rStart = i; break; }
}
if (rStart >= 0) {
  for (let i = rStart; i < L.length; i++) {
    if (L[i].trim() === '}') { rEnd = i; break; }
  }
}
if (rStart >= 0 && rEnd > rStart) {
  const body = [
    '/**',
    ' * 恢复快照。',
    ' * 安全措施：',
    ' *  1. 恢复前先自动创建当前状态的「回滚快照」，失败时提示用哪个 id 回退；',
    ' *  2. 先把现有文件备份到临时目录，覆盖过程中出错则从临时目录还原；',
    ' *  3. 返回被覆盖/新增的文件数，供 UI 展示。',
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
    '  // 1) 自动创建回滚快照（失败不阻断恢复，但要告诉用户）',
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
  ];
  L.splice(rStart, rEnd - rStart + 1, ...body);
  applied.push('restoreSnapshot 回滚');
}

fs.writeFileSync(p, L.join(String.fromCharCode(10)), 'utf8');
console.log('applied: ' + applied.join(', '));
