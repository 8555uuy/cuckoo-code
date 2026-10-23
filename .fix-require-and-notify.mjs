import fs from 'node:fs';
const NL = String.fromCharCode(10);

// 1. 修复 gateway.js 的 require 语句
const p1 = 'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/providers/gateway.js';
let g = fs.readFileSync(p1, 'utf8');
const oldReq = "const { messagesToText, chatCompletion, streamChunk, sseLine } = require('../lib/openai-api.js');";
const newReq = "const { messagesToText, chatCompletion, streamChunk, sseLine, toolsToPrompt, parseToolCalls, chatCompletionWithCalls } = require('../lib/openai-api.js');";
if (g.includes(oldReq)) {
  g = g.replace(oldReq, newReq);
  fs.writeFileSync(p1, g, 'utf8');
  fs.writeFileSync('C:/Users/Administrator/.cuckoo/plugins/ai-gateway/providers/gateway.js', g, 'utf8');
  console.log('✅ gateway.js require 已修复');
} else {
  console.log('❌ 找不到 require 行');
}

// 2. 修改 renderer.ts 关闭系统通知
const p2 = 'D:/cuckoo-code/src/app/ipc/renderer.ts';
let r = fs.readFileSync(p2, 'utf8');
const anchor = 'const notification = new Notification({'
if (r.includes(anchor) && !r.includes('if (globalThis.__CUCKOO_DISABLE_NOTIFY)')) {
  r = r.replace(anchor, 'if (!(globalThis as any).__CUCKOO_DISABLE_NOTIFY) {' + NL + '  ' + anchor);
  // 找到 notification 块的结尾并加 }
  const match = r.match(/const notification = new Notification\(\{[\s\S]*?\}\);/);
  if (match) {
    r = r.replace(match[0], match[0] + NL + '}');
  }
  fs.writeFileSync(p2, r, 'utf8');
  console.log('✅ renderer.ts 已加通知静音拦截');
} else {
  console.log('❌ renderer.ts 未找到或已修改');
}

// 3. 在 subagent.ts 的 runGatewayQuery 里开启静音
const p3 = 'D:/cuckoo-code/src/app/subagent.ts';
let s = fs.readFileSync(p3, 'utf8');
if (!s.includes('__CUCKOO_DISABLE_NOTIFY = true')) {
  const anchor3 = 'gatewayActive++;';
  if (s.includes(anchor3)) {
    s = s.replace(anchor3, 'gatewayActive++;' + NL + '  (globalThis as any).__CUCKOO_DISABLE_NOTIFY = true;');
  }
  const anchor4 = 'gatewayActive = Math.max(0, gatewayActive - 1);';
  if (s.includes(anchor4)) {
    s = s.replace(anchor4, 'gatewayActive = Math.max(0, gatewayActive - 1);' + NL + '    (globalThis as any).__CUCKOO_DISABLE_NOTIFY = false;');
  }
  fs.writeFileSync(p3, s, 'utf8');
  console.log('✅ subagent.ts 已加静音开关');
}