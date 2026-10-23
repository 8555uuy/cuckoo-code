import fs from 'node:fs';
const NL = String.fromCharCode(10);
const BT = String.fromCharCode(96);
const p = 'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/lib/openai-api.js';
let s = fs.readFileSync(p, 'utf8');

if (!s.includes('function toolsToPrompt')) {
  const codeLines = [
    '/** 把客户端传的 OpenAI tools 转成发给网页版 AI 的提示词 */',
    'function toolsToPrompt(tools) {',
    '  if (!Array.isArray(tools) || tools.length === 0) return "";',
    '  var lines = [',
    '    "你可以使用以下工具（在回复中通过执行 cuckoo 代码块来调用）：",',
    '    "格式要求：",',
    '    "' + BT + BT + BT + 'cuckoo",',
    '    "工具名({ 参数 });",',
    '    "' + BT + BT + BT + '",',
    '    ""',
    '  ];',
    '  for (var i = 0; i < tools.length; i++) {',
    '    var t = tools[i];',
    '    if (t.type !== "function" || !t.function) continue;',
    '    lines.push("- " + t.function.name + ": " + (t.function.description || ""));',
    '    if (t.function.parameters) {',
    '      lines.push("  参数: " + JSON.stringify(t.function.parameters));',
    '    }',
    '  }',
    '  lines.push("");',
    '  lines.push("注意：一次只能调用一个工具，不要在代码块外输出多余解释。");',
    '  return lines.join("\\n");',
    '}',
    '',
    '/** 从纯文本回复中提取 cuckoo 代码块，转成 OpenAI tool_calls */',
    'function parseToolCalls(text) {',
    '  if (!text) return null;',
    '  var re = new RegExp(BT + "{3}(?:cuckoo|javascript|js)\\\\s*\\\\n([\\\\s\\\\S]*?)" + BT + "{3}", "gi");',
    '  var match;',
    '  var calls = [];',
    '  var id = 0;',
    '  while ((match = re.exec(text)) !== null) {',
    '    var code = match[1].trim();',
    '    var fnMatch = code.match(/^([a-zA-Z0-9_]+)\\\\s*\\\\(([\\\\s\\\\S]*)\\\\)/);',
    '    if (fnMatch) {',
    '      var fnName = fnMatch[1];',
    '      var argsStr = fnMatch[2].trim();',
    '      var argsObj = {};',
    '      try { argsObj = JSON.parse(argsStr); } catch (e) { argsObj = { text: argsStr }; }',
    '      calls.push({',
    '        id: "call_" + (id++) + "_" + Date.now(),',
    '        type: "function",',
    '        function: { name: fnName, arguments: JSON.stringify(argsObj) }',
    '      });',
    '    }',
    '  }',
    '  return calls.length > 0 ? calls : null;',
    '}',
    '',
    '/** 带 tool_calls 的完整响应 */',
    'function chatCompletionWithCalls(id, model, text, calls) {',
    '  return {',
    '    id: id, object: "chat.completion", created: Math.floor(Date.now() / 1000), model: model,',
    '    choices: [{',
    '      index: 0,',
    '      message: { role: "assistant", content: text.replace(new RegExp(BT + "{3}(?:cuckoo|javascript|js)\\\\s*\\\\n[\\\\s\\\\S]*?" + BT + "{3}", "gi"), ""), tool_calls: calls },',
    '      finish_reason: "tool_calls"',
    '    }],',
    '    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },',
    '  };',
    '}',
    '',
    'module.exports = { messagesToText, chatCompletion, streamChunk, sseLine, toolsToPrompt, parseToolCalls, chatCompletionWithCalls };'
  ];
  const injected = codeLines.join(NL).split('BT').join(BT);
  s = s.replace('module.exports = { messagesToText, chatCompletion, streamChunk, sseLine };', injected);
  fs.writeFileSync(p, s, 'utf8');
  console.log('openai-api.js 扩展完成');
} else {
  console.log('已存在，跳过');
}