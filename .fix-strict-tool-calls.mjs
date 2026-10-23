import fs from 'node:fs';
const NL = String.fromCharCode(10);
const p = 'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/providers/gateway.js';
let s = fs.readFileSync(p, 'utf8');

// 1. 修改流式 tool_calls 发送逻辑（严格分帧）
const oldLoop = [
  '      if (calls && calls.length > 0) {',
  '        calls.forEach(function(c, i) {',
  '          const chunk = {',
  '            tool_calls: [',
  '              { index: i, id: c.id, type: c.type, function: { name: c.function.name, arguments: c.function.arguments } }',
  '            ]',
  '          };',
  '          res.write(sseLine(streamChunk(id, model, chunk, null)));',
  '        });',
  '        res.write(sseLine(streamChunk(id, model, {}, \'tool_calls\')));'
].join(NL);

const newLoop = [
  '      if (calls && calls.length > 0) {',
  '        calls.forEach(function(c, i) {',
  '          // 第一帧：声明 ID 和 函数名（arguments 为空）',
  '          res.write(sseLine(streamChunk(id, model, {',
  '            tool_calls: [{ index: i, id: c.id, type: c.type, function: { name: c.function.name, arguments: \'\' } }]',
  '          }, null)));',
  '          // 第二帧：发送 arguments 内容',
  '          res.write(sseLine(streamChunk(id, model, {',
  '            tool_calls: [{ index: i, function: { arguments: c.function.arguments } }]',
  '          }, null)));',
  '        });',
  '        res.write(sseLine(streamChunk(id, model, {}, \'tool_calls\')));'
].join(NL);

if (s.includes(oldLoop)) {
  s = s.replace(oldLoop, newLoop);
  console.log('✅ 流式 tool_calls 已改为严格分帧');
} else {
  console.log('❌ 找不到 tool_calls 循环');
}

// 2. 在 handle 路由里加兜底，防止崩溃 500
const oldRoute = 'if ((p === \'/v1/chat/completions\' || p === \'/chat/completions\') && req.method === \'POST\') {' + NL + '    const body = await readBody(req);' + NL + '    return handleChat(req, res, body);' + NL + '  }';
const newRoute = 'if ((p === \'/v1/chat/completions\' || p === \'/chat/completions\') && req.method === \'POST\') {' + NL + '    const body = await readBody(req);' + NL + '    handleChat(req, res, body).catch(function(err) {' + NL + '      console.error(\'[ai-gateway] handleChat 崩溃:\', err);' + NL + '      try { if (!res.headersSent) json(res, 500, { error: { message: err.message } }); else res.end(); } catch (_) {}' + NL + '    });' + NL + '    return;' + NL + '  }';
if (s.includes(oldRoute)) {
  s = s.replace(oldRoute, newRoute);
  console.log('✅ 已加外层异常捕获');
} else {
  console.log('❌ 路由捕获未匹配');
}

fs.writeFileSync(p, s, 'utf8');
fs.writeFileSync('C:/Users/Administrator/.cuckoo/plugins/ai-gateway/providers/gateway.js', s, 'utf8');
console.log('done');