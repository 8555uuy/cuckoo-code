import fs from 'node:fs';
const NL = String.fromCharCode(10);
let n = 0;

// ===== 1. project-context.ts：替换 168-172 行（combined 组装） =====
{
  const p = 'D:/cuckoo-code/src/session/project-context.ts';
  const L = fs.readFileSync(p, 'utf8').split(NL);
  // 找 "let combined = built.prompt;" 的行
  let a = -1, b = -1;
  for (let i = 150; i < 200; i++) {
    if (L[i] && L[i].includes('let combined = built.prompt;')) { a = i; break; }
  }
  if (a >= 0) {
    // 找对应的 } 结束（if (extraPrompt) { ... } 的闭合）
    for (let i = a; i < a + 12; i++) {
      if (L[i] && L[i].trim() === '}' && L[i + 1] && L[i + 1].includes('console.log(\'[Cuckoo Code] 准备发送')) { b = i; break; }
    }
  }
  console.log('project-context: a=' + (a+1) + ' b=' + (b+1));
  if (a >= 0 && b > a) {
    const indent = '  ';
    const block = [
      indent + 'let combined: string;',
      indent + 'if (noCuckooPrompt) {',
      indent + '  // B 模式（平台原生）：不注入 Cuckoo 提示词，只发用户消息',
      indent + '  combined = extraPrompt || \'\';',
      indent + '  if (!combined) {',
      indent + "    return { success: false, message: 'B 模式需要非空的用户消息' };",
      indent + '  }',
      indent + "  stepLog('B 模式：跳过 Cuckoo 提示词，只发用户消息');",
      indent + '} else {',
      indent + '  // 组装 Cuckoo 提示词（模板读取 + 占位符填充 + MCP/平台/项目章节）',
      indent + '  const built = buildPrompt({ providerId, selectedDir, isCompaction });',
      indent + '  if (built.error) {',
      indent + '    return { success: false, message: built.error };',
      indent + '  }',
      indent + "  stepLog('提示词组装完成');",
      '',
      indent + '  combined = built.prompt;',
      indent + '  // 子代理等场景：在完整系统提示词末尾追加"代理系统提示 + 任务"',
      indent + '  if (extraPrompt) {',
      indent + "    combined += '\\n\\n---\\n\\n' + extraPrompt;",
      indent + '  }',
      indent + '}',
    ];
    L.splice(a, b - a + 1, ...block);
    fs.writeFileSync(p, L.join(NL), 'utf8');
    console.log('project-context OK');
    n++;
  }
}

// ===== 2. bridge/subagent.ts：在 onInterceptedResponse 的 const blocks 前插 B 模式判断 =====
{
  const p = 'D:/cuckoo-code/src/bridge/subagent.ts';
  const L = fs.readFileSync(p, 'utf8').split(NL);
  let target = -1;
  for (let i = 80; i < 120; i++) {
    if (L[i] && L[i].includes('const blocks = extractJsToolBlocks(raw);')) { target = i; break; }
  }
  console.log('subagent: target=' + (target+1));
  if (target >= 0 && !L.slice(target - 5, target).join('').includes('noCuckooPrompt')) {
    const indent = '    ';
    const block = [
      indent + '// B 模式：不解析工具块，任何回复都视为最终结果（平台原生回复）',
      indent + 'if (cfg.noCuckooPrompt) {',
      indent + "  console.log('[Cuckoo Code][子代理] B模式收到回复，长度=' + raw.length);",
      indent + "  pushProgress({ status: 'done', text: raw, done: true });",
      indent + "  ipcRenderer.invoke('subagent-response', { text: raw, done: true }).catch(() => {});",
      indent + '  return;',
      indent + '}',
    ];
    L.splice(target, 0, ...block);
    fs.writeFileSync(p, L.join(NL), 'utf8');
    console.log('subagent OK');
    n++;
  }
}

console.log('done n=' + n);
