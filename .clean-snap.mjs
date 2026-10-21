import fs from 'node:fs';
const p = 'D:/cuckoo-code/src/app/snapshots.ts';
const NL = String.fromCharCode(10);
let L = fs.readFileSync(p, 'utf8').split(NL);

// 1. 删掉孤立的旧函数体 107-120 行（索引 106..119，共 14 行）
// 先确认边界
console.log('106: ' + JSON.stringify(L[105]));
console.log('106(0based): ' + JSON.stringify(L[106]));
console.log('119: ' + JSON.stringify(L[119]));
console.log('120: ' + JSON.stringify(L[120]));

// 找到 "}" 结束（106 行是 }）后的孤儿代码：从 '    for (const ent of entries) {' 开始到下一个 '}' 结束
let orphanStart = -1, orphanEnd = -1;
for (let i = 104; i < L.length; i++) {
  if (L[i] && L[i].trim() === 'for (const ent of entries) {') { orphanStart = i; break; }
}
if (orphanStart >= 0) {
  for (let i = orphanStart; i < L.length; i++) {
    if (L[i].trim() === '}') { orphanEnd = i; break; }
  }
}
console.log('orphan: ' + orphanStart + '-' + orphanEnd);

if (orphanStart >= 0 && orphanEnd > orphanStart) {
  L.splice(orphanStart, orphanEnd - orphanStart + 1);
  console.log('已删除孤儿代码 ' + (orphanEnd - orphanStart + 1) + ' 行');
}

// 2. 修注释（80-81 行合并成两行）
let fixComment = -1;
for (let i = 75; i < 90; i++) {
  if (L[i] && L[i].includes('同时累加总大小') && L[i].includes('/**') === false) { fixComment = i; break; }
}
if (fixComment >= 0) {
  L[fixComment] = ' * 同时累加总大小；超过 MAX_SNAPSHOT_BYTES 时抛错（避免生成超大快照）。';
  L[fixComment - 1] = ' */';
  // 上面一行如果是 ' * 递归收集...' 保持不变
  // 检查前面是否有重复的 /** 和 */
  console.log('注释已修 at ' + fixComment);
}

// 3. 清理重复的 doc 注释块（77-79 是旧注释，80-81 是新注释开头）
// 更简单：检查 77-81 区间，如果出现两次 /** 则删一个
let firstDoc = -1, secondDoc = -1;
for (let i = 74; i < 90; i++) {
  if (L[i] && L[i].trim() === '/**') {
    if (firstDoc < 0) firstDoc = i; else { secondDoc = i; break; }
  }
}
if (secondDoc > 0 && firstDoc >= 0 && secondDoc - firstDoc < 6) {
  // 删第一个 doc 块（从 firstDoc 到它后面的 */）
  let endDoc = -1;
  for (let i = firstDoc; i < secondDoc; i++) {
    if (L[i] && L[i].includes('*/')) { endDoc = i; break; }
  }
  if (endDoc > 0) {
    L.splice(firstDoc, endDoc - firstDoc + 1);
    console.log('删重复 doc ' + (firstDoc + 1) + '-' + (endDoc + 1));
  }
}

fs.writeFileSync(p, L.join(NL), 'utf8');
console.log('done');
