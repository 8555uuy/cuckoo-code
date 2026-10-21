import fs from 'node:fs';
const targets = [
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/providers/gateway.js',
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway/providers/gateway.js',
];
const NL = String.fromCharCode(10);

for (const p of targets) {
  let s = fs.readFileSync(p, 'utf8');
  const old = "function json(res, code, obj) {" + NL + "  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': (req.headers.origin || 'http://127.0.0.1') });";
  if (s.includes(old)) {
    // json 没有 req：从 res 上取（Node 的 res.req 指向原始 req）
    const neu = "function json(res, code, obj) {" + NL + "  var _o = (res && res.req && res.req.headers && res.req.headers.origin) || 'http://127.0.0.1';" + NL + "  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': _o });";
    s = s.replace(old, neu);
    fs.writeFileSync(p, s, 'utf8');
    console.log('OK ' + p.split('/').slice(-3).join('/'));
  } else {
    console.log('MISS ' + p.split('/').slice(-3).join('/'));
  }
}
