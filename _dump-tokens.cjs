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
  // 读 <html> 上所有 --dsw-* 变量（含 computed）
  const expr = `(() => {
    const out = {};
    // 1) documentElement 上直接定义的
    const cs = getComputedStyle(document.documentElement);
    for (let i = 0; i < cs.length; i++) { const p = cs[i]; if (p.startsWith('--dsw-')) out[p] = cs.getPropertyValue(p).trim(); }
    // 2) 遍历所有 stylesheet 的 :root 规则
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.style && rule.selectorText && /:root|html|\[data-theme/.test(rule.selectorText)) {
            for (const prop of rule.style) { if (prop.startsWith('--dsw-')) out[prop] = rule.style.getPropertyValue(prop).trim(); }
          }
        }
      } catch (_) {}
    }
    return JSON.stringify({ theme: document.documentElement.dataset.theme || document.documentElement.className || '', vars: out });
  })()`;
  const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  const data = JSON.parse(res.result.result.value);
  const keys = Object.keys(data.vars).sort();
  console.log('theme 标记: ' + data.theme);
  console.log('变量总数: ' + keys.length);
  fs.writeFileSync('C:/d/SourceCode/2026/cuckoo-code/_dsh-tokens-dark.json', JSON.stringify(data, null, 2), 'utf8');
  console.log('✅ 已保存到 _dsh-tokens-dark.json');
  ws.close();
})();
