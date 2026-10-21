import fs from 'node:fs';
const p = 'D:/cuckoo-code/src/infra/memories.ts';
let s = fs.readFileSync(p, 'utf8');
const NL = String.fromCharCode(10);

// 4. listMemories 损坏备份
const old4 = [
  '  } catch (err: any) {',
  "    console.error('[Memories] 读取失败:', err.message);",
  '  }',
  '  return [];',
  '}',
].join(NL);
if (s.includes(old4) && !s.includes('.corrupt-')) {
  s = s.replace(old4, [
    '  } catch (err: any) {',
    "    console.error('[Memories] 读取失败:', err.message);",
    '    // 损坏时备份原文件，避免后续写入把用户数据永久覆盖',
    "    try { fs.renameSync(file, file + '.corrupt-' + Date.now()); } catch (_) {}",
    '  }',
    '  return [];',
    '}',
  ].join(NL));
  console.log('OK 损坏备份');
} else { console.log('skip 损坏备份'); }

// 5. saveMemories 原子写入
const old5 = [
  '    fs.mkdirSync(path.dirname(file), { recursive: true });',
  "    fs.writeFileSync(file, JSON.stringify(clean, null, 2), 'utf-8');",
].join(NL);
if (s.includes(old5)) {
  s = s.replace(old5, [
    '    fs.mkdirSync(path.dirname(file), { recursive: true });',
    '    // 原子写入：先写临时文件 → fsync → rename 替换',
    "    const tmp = file + '.' + process.pid + '.' + Date.now() + '.tmp';",
    '    try {',
    "      const fd = fs.openSync(tmp, 'w');",
    "      try { fs.writeFileSync(fd, JSON.stringify(clean, null, 2), 'utf-8'); fs.fsyncSync(fd); }",
    '      finally { fs.closeSync(fd); }',
    '      fs.renameSync(tmp, file);',
    '    } catch (e) {',
    '      try { fs.unlinkSync(tmp); } catch (_) {}',
    '      throw e;',
    '    }',
  ].join(NL));
  console.log('OK 原子写入');
} else { console.log('skip 原子写入'); }

// 6. addMemory 加锁 + 稳定 id
const old6 = [
  'function addMemory(text: string): Memory | null {',
  "  const t = typeof text === 'string' ? text.trim() : '';",
  '  if (!t) return null;',
  '',
  '  const list = listMemories();',
  '  // 去重：内容完全相同则不重复添加',
  '  const existing = list.find((m) => m.text === t);',
  '  if (existing) return existing;',
  '',
  '  const now = Date.now();',
  '  const mem: Memory = {',
  "    id: 'mem-' + now + '-' + Math.random().toString(36).slice(2, 8),",
  '    text: t,',
  '    createdAt: now,',
  '    updatedAt: now,',
  '  };',
  '  list.push(mem);',
  '  return saveMemories(list) ? mem : null;',
  '}',
].join(NL);
if (s.includes(old6)) {
  s = s.replace(old6, [
    'function addMemory(text: string): Memory | null {',
    "  const t = typeof text === 'string' ? text.trim() : '';",
    '  if (!t) return null;',
    '',
    '  return withMemLock(() => {',
    '    const list = listMemories();',
    '    const existing = list.find((m) => m.text === t);',
    '    if (existing) return existing;',
    '',
    '    const now = Date.now();',
    '    const mem: Memory = {',
    '      id: stableId(t + now),',
    '      text: t,',
    '      createdAt: now,',
    '      updatedAt: now,',
    '    };',
    '    list.push(mem);',
    '    return saveMemories(list) ? mem : null;',
    '  });',
    '}',
  ].join(NL));
  console.log('OK addMemory 加锁');
} else { console.log('skip addMemory'); }

// 7. removeMemory 加锁
const old7 = [
  'function removeMemory(id: string): boolean {',
  '  const list = listMemories();',
  '  const next = list.filter((m) => m.id !== id);',
  '  if (next.length === list.length) return false;',
  '  return saveMemories(next);',
  '}',
].join(NL);
if (s.includes(old7)) {
  s = s.replace(old7, [
    'function removeMemory(id: string): boolean {',
    '  return withMemLock(() => {',
    '    const list = listMemories();',
    '    const next = list.filter((m) => m.id !== id);',
    '    if (next.length === list.length) return false;',
    '    return saveMemories(next);',
    '  });',
    '}',
  ].join(NL));
  console.log('OK removeMemory 加锁');
} else { console.log('skip removeMemory'); }

fs.writeFileSync(p, s, 'utf8');
