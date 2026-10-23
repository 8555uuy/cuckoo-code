import fs from 'node:fs';
const NL = String.fromCharCode(10);
const p = 'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/providers/gateway.js';
const L = fs.readFileSync(p, 'utf8').split(NL);

// 1. 修改 stream 判断（去掉 !hasTools）
for (let i = 0; i < L.length; i++) {
  if (L[i] && L[i].includes('const stream = body.stream === true && !hasTools;')) {
    L[i] = L[i].replace('body.stream === true && !hasTools', 'body.stream === true');
    console.log('✅ stream 判断已改');
    break;
  }
}

// 2. 替换流式段（找 // 流式：... 到 // 非流式）
let start = -1, end = -1;
for (let i = 0; i < L.length; i++) {
  if (L[i] && L[i].includes('// 流式：思考 → reasoning_content')) { start = i; break; }
}
if (start >= 0) {
  for (let i = start + 1; i < L.length; i++) {
    if (L[i] && L[i].includes('// 非流式')) { end = i; break; }
  }
}
console.log('start=' + (start+1) + ' end=' + (end+1));

if (start >= 0 && end > start) {
  const newBlock = [
    '  // 流式：思考 → reasoning_content，正文 → content（像真 API）',
    '  if (stream) {',
    '    res.writeHead(200, {',
    "      'Content-Type': 'text/event-stream; charset=utf-8',",
    "      'Cache-Control': 'no-cache',",
    "      'Connection': 'keep-alive',",
    "      'Access-Control-Allow-Origin': (res.req && res.req.headers && res.req.headers.origin) || 'http://127.0.0.1',",
    '    });',
    "    res.write(sseLine(streamChunk(id, model, { role: 'assistant', content: '' }, null)));",
    '    // 多轮（工具循环）流式：每轮文本会重置，需按轮追踪已发送内容',
    '    let lastRawLen = 0, lastRawThinkLen = 0;',
    "    let turnTextSent = '', turnThinkSent = '';",
    '    let wroteAny = false;',
    '    const r = await run({',
    '      text: text,',
    '      parentWindowId: parentWindowId,',
    '      noCuckooPrompt: cfg.nativeMode === true,',
    '      interceptTools: hasTools,',
    '      onChunk: function (c) {',
    '        try {',
    "          const raw = (c && c.text) || '';",
    "          const rawThink = (c && c.think) || '';",
    '          if (raw.length < lastRawLen || rawThink.length < lastRawThinkLen) {',
    "            turnTextSent = ''; turnThinkSent = '';",
    '          }',
    '          lastRawLen = raw.length;',
    '          lastRawThinkLen = rawThink.length;',
    '          if (rawThink.length > turnThinkSent.length) {',
    '            const delta = rawThink.slice(turnThinkSent.length);',
    '            turnThinkSent = rawThink;',
    '            res.write(sseLine(streamChunk(id, model, { reasoning_content: delta }, null)));',
    '            wroteAny = true;',
    '          }',
    '          const clean = stripToolBlocks(raw);',
    '          if (clean.length > turnTextSent.length) {',
    '            const delta = clean.slice(turnTextSent.length);',
    '            turnTextSent = clean;',
    '            res.write(sseLine(streamChunk(id, model, { content: delta }, null)));',
    '            wroteAny = true;',
    '          }',
    '        } catch (_) { /* ignore */ }',
    '      },',
    '    });',
    '    if (!r.ok) {',
    "      addLog({ type: 'chat', model, stream, ok: false, error: r.error });",
    "      res.write(sseLine({ error: { message: r.error || '未知错误' } }));",
    "      res.write('data: [DONE]\\n\\n');",
    '      res.end();',
    '      return;',
    '    }',
    '    if (hasTools) {',
    "      const calls = parseToolCalls(r.text || '');",
    '      if (calls && calls.length > 0) {',
    '        calls.forEach(function(c, i) {',
    '          const chunk = {',
    '            tool_calls: [',
    '              { index: i, id: c.id, type: c.type, function: { name: c.function.name, arguments: c.function.arguments } }',
    '            ]',
    '          };',
    '          res.write(sseLine(streamChunk(id, model, chunk, null)));',
    '        });',
    "        res.write(sseLine(streamChunk(id, model, {}, 'tool_calls')));",
    "        addLog({ type: 'chat', model, stream: true, ok: true, replyLen: (r.text || '').length, tools: calls.length });",
    '      } else {',
    "        const clean = stripToolBlocks(r.text || '');",
    '        if (clean) res.write(sseLine(streamChunk(id, model, { content: clean }, null)));',
    "        res.write(sseLine(streamChunk(id, model, {}, 'stop')));",
    '      }',
    '    } else {',
    '      if (!wroteAny && r.text) {',
    '        const clean = stripToolBlocks(r.text);',
    '        if (clean) res.write(sseLine(streamChunk(id, model, { content: clean }, null)));',
    '      }',
    "      res.write(sseLine(streamChunk(id, model, {}, 'stop')));",
    '    }',
    "    res.write('data: [DONE]\\n\\n');",
    '    res.end();',
    '    return;',
    '  }',
    '',
  ];

  L.splice(start, end - start, ...newBlock);
  fs.writeFileSync(p, L.join(NL), 'utf8');
  fs.writeFileSync('C:/Users/Administrator/.cuckoo/plugins/ai-gateway/providers/gateway.js', L.join(NL), 'utf8');
  console.log('✅ 流式段已替换');
} else {
  console.log('❌ 定位失败');
}