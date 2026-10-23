import fs from 'node:fs';
const NL = String.fromCharCode(10);
const p = 'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/providers/gateway.js';
let s = fs.readFileSync(p, 'utf8');

// 1. 在流式开始处增加心跳定时器
const oldStreamStart = [
  '    res.write(sseLine(streamChunk(id, model, { role: \'assistant\', content: \'\' }, null)));',
  '    let lastRawLen = 0, lastRawThinkLen = 0;'
].join(NL);
const newStreamStart = [
  '    res.write(sseLine(streamChunk(id, model, { role: \'assistant\', content: \'\' }, null)));',
  '    // 心跳保活，防止客户端因等待太久而重连',
  '    const keepAlive = setInterval(function () {',
  '      try { res.write(\': keep-alive\\n\\n\'); } catch (e) {}',
  '    }, 3000);',
  '    let lastRawLen = 0, lastRawThinkLen = 0;'
].join(NL);
if (s.includes(oldStreamStart)) {
  s = s.replace(oldStreamStart, newStreamStart);
  console.log('✅ 已加心跳保活');
}

// 2. 在流式结束和异常处清理定时器
const oldEnd = [
  '    res.write(\'data: [DONE]\\n\\n\');',
  '    res.end();',
  '    return;',
  '  }'
].join(NL);
const newEnd = [
  '    clearInterval(keepAlive);',
  '    res.write(\'data: [DONE]\\n\\n\');',
  '    res.end();',
  '    return;',
  '  }'
].join(NL);
// 替换两处（正常结束和错误结束）
s = s.split(oldEnd).join(newEnd);

// 异常处（!r.ok 分支里也有 res.end()）
const oldErrEnd = [
  '      res.write(\'data: [DONE]\\n\\n\');',
  '      res.end();',
  '      return;',
  '    }'
].join(NL);
const newErrEnd = [
  '      clearInterval(keepAlive);',
  '      res.write(\'data: [DONE]\\n\\n\');',
  '      res.end();',
  '      return;',
  '    }'
].join(NL);
s = s.split(oldErrEnd).join(newErrEnd);

// 3. 在最外层的路由里加上 await 的异常捕获，避免直接断开
const oldHandle = 'if ((p === \'/v1/chat/completions\' || p === \'/chat/completions\') && req.method === \'POST\') {' + NL + '    const body = await readBody(req);' + NL + '    return handleChat(req, res, body);' + NL + '  }';
const newHandle = 'if ((p === \'/v1/chat/completions\' || p === \'/chat/completions\') && req.method === \'POST\') {' + NL + '    const body = await readBody(req);' + NL + '    handleChat(req, res, body).catch(function(e) {' + NL + '      console.error(\'[ai-gateway] handleChat 崩溃:\', e);' + NL + '      try { if (!res.headersSent) json(res, 500, { error: { message: e.message } }); else res.end(); } catch (_) {}' + NL + '    });' + NL + '    return;' + NL + '  }';
if (s.includes(oldHandle)) {
  s = s.replace(oldHandle, newHandle);
  console.log('✅ 已加外层异常捕获');
} else {
  console.log('⚠️ 路由未匹配，跳过捕获');
}

fs.writeFileSync(p, s, 'utf8');
fs.writeFileSync('C:/Users/Administrator/.cuckoo/plugins/ai-gateway/providers/gateway.js', s, 'utf8');
console.log('done');