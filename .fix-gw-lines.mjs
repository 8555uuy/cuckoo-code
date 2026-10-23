import fs from 'node:fs';
const NL = String.fromCharCode(10);
const dirs = [
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/providers/gateway.js',
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway/providers/gateway.js'
];

for (const p of dirs) {
  const L = fs.readFileSync(p, 'utf8').split(NL);
  let n = 0;

  // 1. 找 'const messages = body.messages' 插入 tools 解析
  for (let i = 0; i < L.length; i++) {
    if (L[i] && L[i].includes('const messages = body.messages')) {
      // 向后找 'const text = messagesToText(messages);'
      let j = i;
      for (; j < i + 10; j++) {
        if (L[j] && L[j].includes('const text = messagesToText(messages);')) break;
      }
      if (j < i + 10 && j < L.length) {
        // 此时 L[i] 是 messages，L[j] 是 text
        // 找到 stream 行（在 i 和 j 之间）
        let sIdx = -1;
        for (let k = i; k < j; k++) {
          if (L[k] && L[k].includes('const stream = ')) { sIdx = k; break; }
        }
        if (sIdx >= 0) {
          const indent = L[sIdx].match(/^\s*/)[0];
          L[sIdx] = L[sIdx].replace('body.stream === true', 'body.stream === true && !hasTools');
          L.splice(sIdx, 0, indent + 'const tools = body.tools || null;', indent + 'const hasTools = Array.isArray(tools) && tools.length > 0;');
          j += 2; // 索引偏移
        }
        // 在 L[j] 之后插入 toolsToPrompt
        const tIndent = L[j].match(/^\s*/)[0];
        L.splice(j + 1, 0, tIndent + 'if (hasTools) {', tIndent + '  const tPrompt = toolsToPrompt(tools);', tIndent + '  if (tPrompt) text += "\\n\\n" + tPrompt;', tIndent + '}');
        n++;
        break;
      }
    }
  }

  // 2. 修改非流式返回
  for (let i = 0; i < L.length; i++) {
    if (L[i] && L[i].includes('return json(res, 200, chatCompletion(id, model, clean));')) {
      const indent = L[i].match(/^\s*/)[0];
      // 在 clean 之前插 if hasTools
      // 找到 const clean 行
      let cIdx = i - 1;
      for (; cIdx > i - 5; cIdx--) {
        if (L[cIdx] && L[cIdx].includes('const clean = ')) break;
      }
      if (cIdx > i - 5) {
        L.splice(cIdx, 0,
          indent + 'if (hasTools) {',
          indent + '  const calls = parseToolCalls(r.text || \'\');',
          indent + '  if (calls && calls.length > 0) {',
          indent + '    addLog({ type: \'chat\', model, stream: false, ok: true, replyLen: (r.text || \'\').length, tools: calls.length });',
          indent + '    return json(res, 200, chatCompletionWithCalls(id, model, r.text || \'\', calls));',
          indent + '  }',
          indent + '}'
        );
        n++;
      }
      break;
    }
  }

  fs.writeFileSync(p, L.join(NL), 'utf8');
  console.log(p.split('/').slice(-2).join('/') + ': 修 ' + n + ' 处');
}