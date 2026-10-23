import fs from 'node:fs';
const NL = String.fromCharCode(10);

// 1. 主进程：runGatewayQuery 支持 interceptTools
{
  const p = 'D:/cuckoo-code/src/app/subagent.ts';
  const L = fs.readFileSync(p, 'utf8').split(NL);
  for (let i = 0; i < L.length; i++) {
    if (L[i] && L[i].includes('noCuckooPrompt?: boolean;')) {
      const indent = L[i].match(/^\s*/)[0];
      L.splice(i + 1, 0, indent + '/** B 模式工具拦截：发现代码块立刻上报，不执行本地工具 */', indent + 'interceptTools?: boolean;');
      break;
    }
  }
  for (let i = 0; i < L.length; i++) {
    if (L[i] && L[i].includes('noCuckooPrompt: opts.noCuckooPrompt === true,')) {
      const indent = L[i].match(/^\s*/)[0];
      L.splice(i + 1, 0, indent + 'interceptTools: opts.interceptTools === true,');
      break;
    }
  }
  fs.writeFileSync(p, L.join(NL), 'utf8');
  console.log('主进程 subagent.ts OK');
}

// 2. 桥接层：bridge/subagent.ts 配置与拦截
{
  const p = 'D:/cuckoo-code/src/bridge/subagent.ts';
  const L = fs.readFileSync(p, 'utf8').split(NL);
  for (let i = 0; i < L.length; i++) {
    if (L[i] && L[i].includes('noCuckooPrompt?: boolean;')) {
      const indent = L[i].match(/^\s*/)[0];
      L.splice(i + 1, 0, indent + '/** B 模式工具拦截 */', indent + 'interceptTools?: boolean;');
      break;
    }
  }
  // 在 onInterceptedResponse 里拦截
  for (let i = 0; i < L.length; i++) {
    if (L[i] && L[i].includes('const blocks = extractJsToolBlocks(raw);')) {
      // 前面插入 if interceptTools
      const indent = L[i].match(/^\s*/)[0];
      L.splice(i, 0,
        indent + 'if (cfg.interceptTools && blocks.length > 0) {',
        indent + "  console.log('[Cuckoo Code][网关] 拦截到工具块，直接返回不执行');",
        indent + "  pushProgress({ status: 'done', text: raw, done: true });",
        indent + "  ipcRenderer.invoke('subagent-response', { text: raw, done: true, intercepted: true }).catch(() => {});",
        indent + '  return;',
        indent + '}'
      );
      break;
    }
  }
  fs.writeFileSync(p, L.join(NL), 'utf8');
  console.log('bridge subagent.ts OK');
}
