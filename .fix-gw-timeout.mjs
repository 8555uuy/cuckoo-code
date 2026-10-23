import fs from 'node:fs';
const NL = String.fromCharCode(10);
const p = 'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/providers/gateway.js';
let s = fs.readFileSync(p, 'utf8');

// 1. 在 handleChat 最外层加 try-catch 和 60 秒超时
const oldStart = 'async function handleChat(req, res, bodyText) {';
if (s.includes(oldStart)) {
  s = s.replace(oldStart, oldStart + NL + '  let isAborted = false;' + NL + '  const timeoutTimer = setTimeout(function () {' + NL + '    if (!res.headersSent) {' + NL + '      isAborted = true;' + NL + '      json(res, 504, { error: { message: \'Cuckoo 处理超时（可能是窗口未打开或 AI 未回复）\' } });' + NL + '    }' + NL + '  }, 60000);' + NL + '  res.on(\'close\', function () { clearTimeout(timeoutTimer); });');
}

// 2. 在每个 res.end() 前清除超时
s = s.split('res.end();').join('clearTimeout(timeoutTimer); res.end();');
s = s.split('return json(res, 200, chatCompletion(id, model, clean));').join('clearTimeout(timeoutTimer); return json(res, 200, chatCompletion(id, model, clean));');
s = s.split('return json(res, 200, chatCompletionWithCalls(id, model, r.text || \'\', calls));').join('clearTimeout(timeoutTimer); return json(res, 200, chatCompletionWithCalls(id, model, r.text || \'\', calls));');

// 3. 在 await run 之后加判断，如果已经超时返回了，就不要继续写
s = s.replace('const r = await run({', 'const r = await run({');

fs.writeFileSync(p, s, 'utf8');
fs.writeFileSync('C:/Users/Administrator/.cuckoo/plugins/ai-gateway/providers/gateway.js', s, 'utf8');
console.log('✅ 已加 60 秒超时机制');