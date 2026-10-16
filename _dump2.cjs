const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const WS = require(path.join(os.homedir(), '.cuckoo', 'profiles', 'default', 'node_modules', 'ws'));
(async () => {
  const list = await (await fetch('http://127.0.0.1:9444/json')).json();
  const page = list.find(t => t.type === 'page');
  const ws = new WS(page.webSocketDebuggerUrl);
  let id = 1;
  const send = (method, params) => new Promise((resolve) => {
    const myId = id++;
    const onMsg = (raw) => { const m = JSON.parse(raw.toString()); if (m.id === myId) { ws.off('message', onMsg); resolve(m); } };
    ws.on('message', onMsg);
    ws.send(JSON.stringify({ id: myId, method, params }));
  });
  await new Promise(r => ws.on('open', r));
  const expr = '(function(){var cs=getComputedStyle(document.documentElement);var names=["--dsw-alias-label-primary","--dsw-alias-label-secondary","--dsw-alias-label-tertiary","--dsw-alias-label-caption","--dsw-alias-bg-layer-1","--dsw-alias-bg-layer-2","--dsw-alias-bg-layer-3","--dsw-alias-border-l1","--dsw-alias-border-l2","--dsw-alias-border-l3","--dsw-alias-border-l4","--dsw-alias-brand-primary","--dsw-alias-button-primary-fill","--dsw-alias-button-primary-hover","--dsw-alias-interactive-bg-hover","--dsw-alias-interactive-bg-hover-danger","--dsw-alias-scrollbar-bg-l2","--dsw-alias-scrollbar-hover-l2","--dsw-alias-state-business-primary","--dsw-alias-state-error-primary","--dsw-alias-state-success-primary","--dsw-alias-state-warning-primary","--dsw-font-mono","--dsw-font-markdown-code-block-small","--dsw-radius-sm","--dsw-radius-md","--dsw-radius-lg","--dsw-shadow-lv1","--dsw-shadow-lv2","--dsw-shadow-lv3"];var o={};for(var i=0;i<names.length;i++){o[names[i]]=cs.getPropertyValue(names[i]).trim();}return JSON.stringify(o);})()';
  const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  const val = res && res.result && res.result.result && res.result.result.value;
  if (!val) { console.log('❌ 无值: ' + JSON.stringify(res).slice(0, 600)); ws.close(); return; }
  const o = JSON.parse(val);
  fs.writeFileSync('C:/d/SourceCode/2026/cuckoo-code/_dsh-alias.json', JSON.stringify(o, null, 2), 'utf8');
  console.log('✅ 已保存');
  for (const k of Object.keys(o)) console.log(k + ' = ' + o[k]);
  ws.close();
})();
