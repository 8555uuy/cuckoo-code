import fs from 'node:fs';
const NL = String.fromCharCode(10);
const dirs = [
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway',
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway',
];

for (const dir of dirs) {
  const p = dir + '/providers/gateway.js';
  let s = fs.readFileSync(p, 'utf8');
  let n = 0;

  // 1. 流式 run 调用：在 parentWindowId 后加 noCuckooPrompt
  const old1 = '      text: text,' + NL + '      parentWindowId: parentWindowId,' + NL + '      onChunk: function (c) {';
  const new1 = '      text: text,' + NL + '      parentWindowId: parentWindowId,' + NL + '      noCuckooPrompt: cfg.nativeMode === true,' + NL + '      onChunk: function (c) {';
  if (s.includes(old1)) { s = s.replace(old1, new1); n++; }

  // 2. 非流式 run 调用
  const old2 = '  const r = await run({ text: text, parentWindowId: parentWindowId });';
  const new2 = '  const r = await run({ text: text, parentWindowId: parentWindowId, noCuckooPrompt: cfg.nativeMode === true });';
  if (s.includes(old2)) { s = s.replace(old2, new2); n++; }

  // 3. stripToolBlocks：B 模式跳过（平台原生回复不剥离）
  const old3 = "  const clean = stripToolBlocks(r.text || '');";
  const new3 = "  // B 模式（平台原生）：不剥离代码块，原样返回" + NL + "  const clean = cfg.nativeMode === true ? (r.text || '') : stripToolBlocks(r.text || '');";
  if (s.includes(old3)) { s = s.replace(old3, new3); n++; }

  fs.writeFileSync(p, s, 'utf8');
  console.log(dir.split('/').pop() + ': 修 ' + n + ' 处');
}
