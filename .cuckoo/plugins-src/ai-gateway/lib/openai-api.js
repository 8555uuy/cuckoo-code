/**
 * OpenAI 兼容层：请求解析 + 响应格式化。
 */
function messagesToText(messages) {
  if (!Array.isArray(messages)) return '';
  const parts = [];
  for (const m of messages) {
    const role = m && m.role;
    let content = m && m.content;
    if (Array.isArray(content)) {
      content = content.map(function (c) { return (c && c.type === 'text' && c.text) ? c.text : ''; }).join('');
    }
    if (typeof content !== 'string') content = '';
    if (!content) continue;
    // 丢弃客户端的 system 消息：Cuckoo 有自己完整的系统提示词（initProject 注入），
    // 再把客户端的 system 拼进来会让两套提示词打架（模型会跟着客户端的走）。
    if (role === 'system') continue;
    if (role === 'assistant') parts.push('[助手] ' + content);
    else parts.push(content);
  }
  return parts.join('\n\n');
}
function chatCompletion(id, model, text) {
  return {
    id: id, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: model,
    choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}
function streamChunk(id, model, delta, finishReason) {
  return {
    id: id, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: model,
    choices: [{ index: 0, delta: delta, finish_reason: finishReason || null }],
  };
}
function sseLine(obj) { return 'data: ' + JSON.stringify(obj) + '\n\n'; }
/** 把客户端传的 OpenAI tools 转成发给网页版 AI 的提示词 */
function toolsToPrompt(tools) {
  if (!Array.isArray(tools) || tools.length === 0) return "";
  var lines = [
    "你可以使用以下工具（在回复中通过执行 cuckoo 代码块来调用）：",
    "格式要求：",
    "```cuckoo",
    "工具名({ 参数 });",
    "```",
    ""
  ];
  for (var i = 0; i < tools.length; i++) {
    var t = tools[i];
    if (t.type !== "function" || !t.function) continue;
    lines.push("- " + t.function.name + ": " + (t.function.description || ""));
    if (t.function.parameters) {
      lines.push("  参数: " + JSON.stringify(t.function.parameters));
    }
  }
  lines.push("");
  lines.push("注意：一次只能调用一个工具，不要在代码块外输出多余解释。");
  return lines.join("\n");
}

/** 从纯文本回复中提取 cuckoo 代码块，转成 OpenAI tool_calls */
function parseToolCalls(text) {
  if (!text) return null;
  var re = new RegExp(` + "{3}(?:cuckoo|javascript|js)\\s*\\n([\\s\\S]*?)" + ` + "{3}", "gi");
  var match;
  var calls = [];
  var id = 0;
  while ((match = re.exec(text)) !== null) {
    var code = match[1].trim();
    var fnMatch = code.match(/^([a-zA-Z0-9_]+)\\s*\\(([\\s\\S]*)\\)/);
    if (fnMatch) {
      var fnName = fnMatch[1];
      var argsStr = fnMatch[2].trim();
      var argsObj = {};
      try { argsObj = JSON.parse(argsStr); } catch (e) { argsObj = { text: argsStr }; }
      calls.push({
        id: "call_" + (id++) + "_" + Date.now(),
        type: "function",
        function: { name: fnName, arguments: JSON.stringify(argsObj) }
      });
    }
  }
  return calls.length > 0 ? calls : null;
}

/** 带 tool_calls 的完整响应 */
function chatCompletionWithCalls(id, model, text, calls) {
  return {
    id: id, object: "chat.completion", created: Math.floor(Date.now() / 1000), model: model,
    choices: [{
      index: 0,
      message: { role: "assistant", content: text.replace(new RegExp(` + "{3}(?:cuckoo|javascript|js)\\s*\\n[\\s\\S]*?" + ` + "{3}", "gi"), ""), tool_calls: calls },
      finish_reason: "tool_calls"
    }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

module.exports = { messagesToText, chatCompletion, streamChunk, sseLine, toolsToPrompt, parseToolCalls, chatCompletionWithCalls };
