import fs from 'node:fs';
const p = 'D:/cuckoo-code/src/infra/memories.ts';
let s = fs.readFileSync(p, 'utf8');
const NL = String.fromCharCode(10);

// ===== 1. normalizeMemory：缺 id 时用内容派生稳定 id =====
const old1 = '    id: typeof raw.id === \'string\' && raw.id ? raw.id : \'mem-\' + now + \'-\' + Math.random().toString(36).slice(2, 8),';
if (s.includes(old1)) {
  s = s.replace(old1, '    id: typeof raw.id === \'string\' && raw.id ? raw.id : stableId(text),');
  console.log('OK normalizeMemory 稳定 id');
}

// ===== 2. 加 stableId + withLock 工具函数（插在 normalizeMemory 之前） =====
const anchor1 = '/** 校验并规整单条记忆 */';
if (s.includes(anchor1) && !s.includes('function stableId')) {
  const helpers = [
    '/** 由内容派生稳定 id（同一内容永远得到同一 id，避免每次读取都变） */',
    'function stableId(text: string): string {',
    '  return \'mem-\' + crypto.createHash(\'sha1\').update(text).digest(\'hex\').slice(0, 16);',
    '}',
    '',
    '/**',
    ' * 文件锁：同进程用内存互斥，跨进程用锁文件（wx 独占创建）。',
    ' * 防止「读-改-写」竞态导致记忆丢失。',
    ' */',
    'let _memLock: Promise<void> = Promise.resolve();',
    'function withMemLock<T>(fn: () => T): T {',
    '  const file = getMemoriesFile() + \'.lock\';',
    '  const deadline = Date.now() + 3000;',
    '  let fd: number | null = null;',
    '  try {',
    '    fs.mkdirSync(path.dirname(file), { recursive: true });',
    '    while (Date.now() < deadline) {',
    '      try { fd = fs.openSync(file, \'wx\'); break; }',
    '      catch (e: any) {',
    '        if (e.code !== \'EEXIST\') break;',
    '        try { if (Date.now() - fs.statSync(file).mtimeMs > 5000) fs.unlinkSync(file); } catch (_) {}',
    '        const end = Date.now() + 20;',
    '        while (Date.now() < end) { /* 同步等待 20ms */ }',
    '      }',
    '    }',
    '    return fn();',
    '  } finally {',
    '    if (fd !== null) { try { fs.closeSync(fd); } catch (_) {} try { fs.unlinkSync(file); } catch (_) {} }',
    '  }',
    '}',
    '',
  ].join(NL);
  s = s.replace(anchor1, helpers + anchor1);
  console.log('OK stableId + withMemLock');
}

// ===== 3. 顶部补 crypto import =====
if (!s.includes("import crypto from 'node:crypto'")) {
  s = s.replace("import os from 'node:os';", "import os from 'node:os';" + NL + "import crypto from 'node:crypto';");
  console.log('OK crypto import');
}

// ===== 4. listMemories：损坏时备份再返回空 =====
const old4 = [
  '  } catch (err: any) {',
  '    console.error(\'[Memories] 读取失败:\', err.message);',
  '  }',
  '  return [];',
  '}',
].join(NL);
if (s.includes(old4)) {
  const new4 = [
    '  } catch (err: any) {',
    '    console.error(\'[Memories] 读取失败:\', err.message);',
    '    // 损坏时备份原文件，避免后续写入把用户数据永久覆盖',
    '    try { fs.renameSync(file, file + \'.corrupt-\' + Date.now()); } catch (_) {}',
    '  }',
    '  return [];',
    '}',
  ].join(NL);
  s = s.replace(old4, new4);
  console.log('OK 损坏备份');
}

// ===== 5. saveMemories：原子写入 =====
const old5 = [
  '    fs.mkdirSync(path.dirname(file), { recursive: true });',
  '    fs.writeFileSync(file, JSON.stringify(clean, null, 2), \'utf-8\');',
  '    console.log(\'[Memories] 已写入\', file);',
  '    return true;',
].join(NL);
if (s.includes(old5)) {
  const new5 = [
    '    fs.mkdirSync(path.dirname(file), { recursive: true });',
    '    // 原子写入：先写临时文件 → fsync → rename 替换，避免中途崩溃留下截断的 JSON',
    '    const tmp = file + \'.\' + process.pid + \'.\' + Date.now() + \'.tmp\';',
    '    try {',
    '      const fd = fs.openSync(tmp, \'w\');',
    '      try { fs.writeFileSync(fd, JSON.stringify(clean, null, 2), \'utf-8\'); fs.fsyncSync(fd); }',
    '      finally { fs.closeSync(fd); }',
    '      fs.renameSync(tmp, file);',
    '    } catch (e) {',
    '      try { fs.unlinkSync(tmp); } catch (_) {}',
    '      throw e;',
    '    }',
    '    console.log(\'[Memories] 已写入\', file);',
    '    return true;',
  ].join(NL);
  s = s.replace(old5, new5);
  console.log('OK 原子写入');
}

fs.writeFileSync(p, s, 'utf8');
