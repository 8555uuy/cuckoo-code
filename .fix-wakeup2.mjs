import fs from 'node:fs';
const NL = String.fromCharCode(10);
const p = 'D:/cuckoo-code/src/app/ipc/subagent.ts';
const L = fs.readFileSync(p, 'utf8').split(NL);
let n = 0;

// 1. 修改 subagent-progress：收到 done 时强制唤醒
for (let i = 0; i < L.length; i++) {
  if (L[i].includes("ipcMain.on('subagent-progress'")) {
    let j = i;
    for (; j < i + 10; j++) {
      if (L[j].includes('const gwCb = getGatewayStream')) break;
    }
    if (j < i + 10) {
      const indent = L[j].match(/^\s*/)[0];
      // 在 gwCb 上方插入直接唤醒逻辑
      L.splice(j, 0,
        indent + 'if (payload.done) {',
        indent + '  onSubagentResponse(ctx.win.id, payload.text || \'\');',
        indent + '}'
      );
      n++;
      break;
    }
  }
}

// 2. 修改 subagent-response 加兜底
for (let i = 0; i < L.length; i++) {
  if (L[i].includes("ipcMain.handle('subagent-response'")) {
    let j = i;
    for (; j < i + 10; j++) {
      if (L[j].includes('const ctx = windowState.getContextByWebContents')) break;
    }
    if (j < i + 10) {
      const indent = L[j].match(/^\s*/)[0];
      // 在 const ctx 后面加一个兜底
      L.splice(j + 1, 0,
        indent + 'if (!ctx) {',
        indent + '  const all = windowState.getAllContexts();',
        indent + '  for (const c of all) {',
        indent + '    if (c.view && c.view.webContents && c.view.webContents.id === event.sender.id) { ctx = c; break; }',
        indent + '    if (c.win && c.win.webContents && c.win.webContents.id === event.sender.id) { ctx = c; break; }',
        indent + '  }',
        indent + '}'
      );
      // 把 const ctx 改成 let ctx
      L[j] = L[j].replace('const ctx', 'let ctx');
      n++;
      break;
    }
  }
}

fs.writeFileSync(p, L.join(NL), 'utf8');
console.log('✅ 修改了 ' + n + ' 处，已加强制唤醒和兜底查找');