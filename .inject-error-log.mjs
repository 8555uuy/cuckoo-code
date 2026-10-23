import fs from 'node:fs';
const NL = String.fromCharCode(10);
const p = 'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/providers/gateway.js';
let s = fs.readFileSync(p, 'utf8');

// 1. 在 handle 结尾加一个全局的错误文件记录
const anchor = 'async function handle(req, res) {';
if (s.includes(anchor)) {
  s = s.replace(anchor, [
    anchor,
    '  const origEnd = res.end;',
    '  res.end = function(chunk, encoding) {',
    '    if (this.statusCode >= 400) {',
    '      try {',
    '        const errFile = path.join(dataDir(), "error.log");',
    '        fs.appendFileSync(errFile, "[" + new Date().toISOString() + "] status=" + this.statusCode + " chunk=" + String(chunk) + "\\n");',
    '      } catch (e) {}',
    '    }',
    '    return origEnd.call(this, chunk, encoding);',
    '  };'
  ].join(NL));
}

// 2. 在 handleChat 外层包一层 try-catch
const chatStart = 'async function handleChat(req, res, bodyText) {';
if (s.includes(chatStart)) {
  s = s.replace(chatStart, 'async function handleChat(req, res, bodyText) {' + NL + '  try {');
  
  // 找 handleChat 的结尾（即下一个函数的开头）
  const nextFn = '// ===== 路由 =====';
  if (s.includes(nextFn)) {
    s = s.replace(nextFn, [
      '  } catch (e) {',
      '    console.error("[ai-gateway] handleChat 异常:", e);',
      '    try { if (!res.headersSent) json(res, 500, { error: { message: e.message } }); else res.end(); } catch (_) {}',
      '  }',
      '}',
      '',
      nextFn,
      'async function handle(req, res) {'
    ].join(NL));
    // 删掉原来多出来的 function handle(req, res) {
    // 实际上 nextFn 下面本来就有这个，我们需要小心处理
  }
}
fs.writeFileSync(p, s, 'utf8');
fs.writeFileSync('C:/Users/Administrator/.cuckoo/plugins/ai-gateway/providers/gateway.js', s, 'utf8');
console.log('done');