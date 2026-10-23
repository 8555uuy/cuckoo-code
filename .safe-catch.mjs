import fs from 'node:fs';
const NL = String.fromCharCode(10);
const p = 'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/providers/gateway.js';
const L = fs.readFileSync(p, 'utf8').split(NL);
let start = -1, end = -1;
for (let i = 0; i < L.length; i++) {
  if (L[i].includes('async function handleChat(req, res, bodyText) {')) { start = i; break; }
}
if (start >= 0) {
  for (let i = start + 1; i < L.length; i++) {
    if (L[i] === '}') { end = i; break; }
  }
}
console.log('handleChat: ' + (start+1) + ' - ' + (end+1));
if (start >= 0 && end > start) {
  const body = L.slice(start + 1, end);
  const newBody = [
    '  try {',
    ...body.map(l => '  ' + l),
    '  } catch (e) {',
    '    console.error("[ai-gateway] handleChat 崩溃:", e);',
    '    try { if (!res.headersSent) json(res, 500, { error: { message: e.message } }); else res.end(); } catch (_) {}',
    '  }',
  ];
  L.splice(start + 1, end - start - 1, ...newBody);
  fs.writeFileSync(p, L.join(NL), 'utf8');
  fs.writeFileSync('C:/Users/Administrator/.cuckoo/plugins/ai-gateway/providers/gateway.js', L.join(NL), 'utf8');
  console.log('✅ 已安全包裹 try-catch');
}