import fs from 'node:fs';
const NL = String.fromCharCode(10);
const p = 'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/providers/gateway.js';
let s = fs.readFileSync(p, 'utf8');

// 1. import 增加 toolsToPrompt, parseToolCalls, chatCompletionWithCalls
s = s.replace(
  "const { messagesToText, chatCompletion, streamChunk, sseLine } = require('./lib/openai-api.js');",
  "const { messagesToText, chatCompletion, streamChunk, sseLine, toolsToPrompt, parseToolCalls, chatCompletionWithCalls } = require('./lib/openai-api.js');"
);
if (!s.includes('toolsToPrompt')) {
  // 可能是解构的长格式，用正则兜底
  s = s.replace(/const \{ messagesToText.*?\} = require\(['"]\.\/openai-api\.js['"]\);/,
    "const { messagesToText, chatCompletion, streamChunk, sseLine, toolsToPrompt, parseToolCalls, chatCompletionWithCalls } = require('./openai-api.js');");
}

// 2. handleChat 解析逻辑：读取 tools，拼接提示词
const oldParse = [
  '  const messages = body.messages || [];',
  '  const model = body.model || \'cuckoo-default\';',
  '  const stream = body.stream === true;',
  '  const text = messagesToText(messages);',
  '  if (!text) return json(res, 400, { error: { message: \'messages 为空\' } });'
].join(NL);
const newParse = [
  '  const messages = body.messages || [];',
  '  const model = body.model || \'cuckoo-default\';',
  '  const tools = body.tools || null;',
  '  const hasTools = Array.isArray(tools) && tools.length > 0;',
  '  // 有 tools 时，强制走非流式（流式工具解析极其复杂，暂时不支持）',
  '  const stream = body.stream === true && !hasTools;',
  '  let text = messagesToText(messages);',
  '  if (!text) return json(res, 400, { error: { message: \'messages 为空\' } });',
  '  if (hasTools) {',
  '    const tPrompt = toolsToPrompt(tools);',
  '    if (tPrompt) text += \'\\n\\n\' + tPrompt;',
  '  }'
].join(NL);
if (s.includes(oldParse)) {
  s = s.replace(oldParse, newParse);
} else {
  console.log('MISS parse block');
}

// 3. 流式调用加上 interceptTools
s = s.replace(
  '      noCuckooPrompt: cfg.nativeMode === true,',
  '      noCuckooPrompt: cfg.nativeMode === true,' + NL + '      interceptTools: hasTools,'
);

// 4. 非流式返回：如果有 tools，解析 tool_calls
const oldRet = [
  '  // B 模式（平台原生）：不剥离代码块，原样返回',
  '  const clean = cfg.nativeMode === true ? (r.text || \'\') : stripToolBlocks(r.text || \'\');',
  '  addLog({ type: \'chat\', model, stream, ok: true, replyLen: clean.length });',
  '  return json(res, 200, chatCompletion(id, model, clean));'
].join(NL);
const newRet = [
  '  // 如果有 tools，优先尝试解析为 tool_calls',
  '  if (hasTools) {',
  '    const calls = parseToolCalls(r.text || \'\');',
  '    if (calls && calls.length > 0) {',
  '      addLog({ type: \'chat\', model, stream: false, ok: true, replyLen: (r.text || \'\').length, tools: calls.length });',
  '      return json(res, 200, chatCompletionWithCalls(id, model, r.text || \'\', calls));',
  '    }',
  '  }',
  '  // B 模式（平台原生）：不剥离代码块，原样返回',
  '  const clean = cfg.nativeMode === true ? (r.text || \'\') : stripToolBlocks(r.text || \'\');',
  '  addLog({ type: \'chat\', model, stream, ok: true, replyLen: clean.length });',
  '  return json(res, 200, chatCompletion(id, model, clean));'
].join(NL);
if (s.includes(oldRet)) {
  s = s.replace(oldRet, newRet);
} else {
  console.log('MISS return block');
}

// 5. 拷贝到运行目录
fs.writeFileSync(p, s, 'utf8');
fs.writeFileSync('C:/Users/Administrator/.cuckoo/plugins/ai-gateway/providers/gateway.js', s, 'utf8');
console.log('gateway.js patched');