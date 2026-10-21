import fs from 'node:fs';
const p = 'D:/cuckoo-code/src/infra/memories.ts';
const L = fs.readFileSync(p, 'utf8').split(String.fromCharCode(10));

// 1) 第 91 行后（index 90）插入损坏备份
if (!L[90].includes('corrupt-')) {
  L.splice(91, 0, "    try { fs.renameSync(file, file + '.corrupt-' + Date.now()); } catch (_) {}");
  console.log('OK 损坏备份');
}

// 2) 第 103 行（原 index 102，因上面插了一行变 103）替换为原子写入
let idx = -1;
for (let i = 95; i < 115; i++) {
  if (L[i] && L[i].includes("fs.writeFileSync(file, JSON.stringify(clean, null, 2), 'utf-8');")) { idx = i; break; }
}
if (idx < 0) { console.log('MISS 原子写入'); } else {
  const indent = '    ';
  L.splice(idx, 1,
    indent + '// 原子写入：先写临时文件 → fsync → rename 替换',
    indent + "const tmp = file + '.' + process.pid + '.' + Date.now() + '.tmp';",
    indent + 'try {',
    indent + "  const fd = fs.openSync(tmp, 'w');",
    indent + "  try { fs.writeFileSync(fd, JSON.stringify(clean, null, 2), 'utf-8'); fs.fsyncSync(fd); }",
    indent + '  finally { fs.closeSync(fd); }',
    indent + '  fs.renameSync(tmp, file);',
    indent + '} catch (e) {',
    indent + '  try { fs.unlinkSync(tmp); } catch (_) {}',
    indent + '  throw e;',
    indent + '}'
  );
  console.log('OK 原子写入');
}

// 3) addMemory 加锁 + 稳定 id
let a = -1, b = -1;
for (let i = 100; i < L.length; i++) {
  if (L[i] && L[i].includes('function addMemory(text: string)')) { a = i; break; }
}
for (let i = a; i < L.length; i++) {
  if (L[i] && L[i].trim() === '}') { b = i; break; }
}
if (a < 0 || b < 0) { console.log('MISS addMemory'); } else {
  const body = [
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
  ];
  L.splice(a, b - a + 1, ...body);
  console.log('OK addMemory 加锁');
}

// 4) removeMemory 加锁
let c = -1, d = -1;
for (let i = 100; i < L.length; i++) {
  if (L[i] && L[i].includes('function removeMemory(id: string)')) { c = i; break; }
}
for (let i = c; i < L.length; i++) {
  if (L[i] && L[i].trim() === '}') { d = i; break; }
}
if (c < 0 || d < 0) { console.log('MISS removeMemory'); } else {
  const body = [
    'function removeMemory(id: string): boolean {',
    '  return withMemLock(() => {',
    '    const list = listMemories();',
    '    const next = list.filter((m) => m.id !== id);',
    '    if (next.length === list.length) return false;',
    '    return saveMemories(next);',
    '  });',
    '}',
  ];
  L.splice(c, d - c + 1, ...body);
  console.log('OK removeMemory 加锁');
}

// 5) updateMemory 加锁 + 去重改为合并
let e = -1, f = -1;
for (let i = 100; i < L.length; i++) {
  if (L[i] && L[i].includes('function updateMemory(id: string')) { e = i; break; }
}
for (let i = e; i < L.length; i++) {
  if (L[i] && L[i].trim() === '}') { f = i; break; }
}
if (e < 0 || f < 0) { console.log('MISS updateMemory'); } else {
  const body = [
    'function updateMemory(id: string, text: string): Memory | null {',
    "  const sid = typeof id === 'string' ? id.trim() : '';",
    "  const t = typeof text === 'string' ? text.trim() : '';",
    '  if (!sid || !t) return null;',
    '  return withMemLock(() => {',
    '    const list = listMemories();',
    '    const idx = list.findIndex((m) => m.id === sid);',
    '    if (idx < 0) return null;',
    '    // 改后与另一条重复：合并（删本条，返回已有那条）',
    '    const dupIdx = list.findIndex((m, i) => i !== idx && m.text === t);',
    '    if (dupIdx >= 0) {',
    '      const dup = list[dupIdx];',
    '      const next = list.filter((_, i) => i !== idx);',
    '      return saveMemories(next) ? dup : null;',
    '    }',
    '    list[idx] = { ...list[idx], text: t, updatedAt: Date.now() };',
    '    return saveMemories(list) ? list[idx] : null;',
    '  });',
    '}',
  ];
  L.splice(e, f - e + 1, ...body);
  console.log('OK updateMemory');
}

fs.writeFileSync(p, L.join(String.fromCharCode(10)), 'utf8');
console.log('done');
