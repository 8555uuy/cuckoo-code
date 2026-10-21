import fs from 'node:fs';
const NL = String.fromCharCode(10);
const dirs = [
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway',
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway',
];

for (const dir of dirs) {
  // ===== 1. gateway.js：配置加 nativeMode + handleChat 传参 =====
  {
    const p = dir + '/providers/gateway.js';
    let s = fs.readFileSync(p, 'utf8');

    // 1a. readConfig 默认值加 nativeMode
    if (!s.includes('nativeMode:')) {
      s = s.replace(
        "const out = { port: 18900, host: '127.0.0.1', adminPassword: '', requireKey: true, autoStart: true, enabled: true };",
        "const out = { port: 18900, host: '127.0.0.1', adminPassword: '', requireKey: true, autoStart: true, enabled: true, nativeMode: false };"
      );
    }
    // 1b. readConfig 读取 nativeMode
    if (!s.includes('c.nativeMode === true')) {
      s = s.replace(
        '      if (c.prankMode === true) out.prankMode = true;',
        '      if (c.prankMode === true) out.prankMode = true;' + NL + '      if (c.nativeMode === true) out.nativeMode = true;'
      );
    }

    // 1c. handleChat 的 run 调用：传 noCuckooPrompt
    const oldRun1 = '  const r = await run({' + NL + '      text: text,' + NL + '      parentWindowId: parentWindowId,';
    if (s.includes(oldRun1) && !s.includes('noCuckooPrompt: cfg.nativeMode')) {
      s = s.replace(oldRun1,
        '  const r = await run({' + NL +
        '      text: text,' + NL +
        '      parentWindowId: parentWindowId,' + NL +
        '      noCuckooPrompt: cfg.nativeMode === true,');
    }
    // 1d. 另一处（非流式）run 调用
    const oldRun2 = /const r = await run\(\{\s*text: text,\s*parentWindowId: parentWindowId\s*\}\);/;
    // 已由上面覆盖，跳过

    fs.writeFileSync(p, s, 'utf8');
    console.log('gateway.js patched: ' + dir.split('/').pop());
  }

  // ===== 2. gateway.js 暴露 IPC 命令 native =====
  {
    const p = dir + '/providers/gateway.js';
    let s = fs.readFileSync(p, 'utf8');
    if (!s.includes("'ai-gateway:native'")) {
      const anchor = "  table['ai-gateway:toggle'] = async function (args) {";
      const block = [
        "  table['ai-gateway:native'] = function (args) {",
        '    const want = !args || args.enabled !== false;',
        '    writeConfig({ nativeMode: want });',
        '    cfg = readConfig();',
        "    console.log('[ai-gateway] B 模式（平台原生）-> ' + (want ? '开' : '关'));",
        '    return { nativeMode: want };',
        '  };',
        '',
      ].join(NL);
      if (s.includes(anchor)) {
        s = s.replace(anchor, block + anchor);
      }
    }
    // stats 返回 nativeMode
    s = s.replace(
      "    prankMode: prankMode,",
      "    prankMode: prankMode," + NL + "    nativeMode: cfg.nativeMode === true,"
    );
    fs.writeFileSync(p, s, 'utf8');
    console.log('gateway.js IPC patched: ' + dir.split('/').pop());
  }
}
console.log('done');
