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
module.exports = { messagesToText, chatCompletion, streamChunk, sseLine };
