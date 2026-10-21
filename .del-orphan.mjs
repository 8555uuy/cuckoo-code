import fs from 'node:fs';
const p = 'D:/cuckoo-code/src/app/snapshots.ts';
const NL = String.fromCharCode(10);
const raw = fs.readFileSync(p, 'utf8');
const hasCRLF = raw.includes('\r' + NL);
const L = raw.split(NL);

// 找 "} {" 这行（索引 228，即第229行）
let orphanStart = -1;
for (let i = 190; i < 250; i++) {
  if (L[i] && L[i].trim() === '} {') { orphanStart = i; break; }
}
console.log('orphanStart: ' + (orphanStart + 1) + ' => ' + JSON.stringify(L[orphanStart]));

// 从 orphanStart 开始找匹配的 "}"（它就是旧函数体的结束）
// 旧函数体是完整的：} { ... }
// 实际上 "} {" 是 "新函数结束 }" + "旧函数开始 {"
// 我们要删除的是从 "{" 开始（在 "} {" 这行的下一行开始算）到旧函数结束的 "}"
let depth = 1;
let i = orphanStart + 1;
// "} {" 里的 { 就算作 depth=1 了
while (i < L.length && depth > 0) {
  const line = L[i];
  for (const ch of line) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  if (depth === 0) break;
  i++;
}
console.log('orphanEnd: ' + (i + 1) + ' => ' + JSON.stringify(L[i]));

if (orphanStart >= 0 && depth === 0) {
  // 把 "} {" 改回 "}"，然后删掉从 orphanStart+1 到 i 的行
  L[orphanStart] = L[orphanStart].replace('} {', '}');
  const count = i - orphanStart;
  L.splice(orphanStart + 1, count);
  console.log('已删除 ' + count + ' 行');
}

fs.writeFileSync(p, L.join(NL), 'utf8');
console.log('done');
