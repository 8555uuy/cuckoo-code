import fs from 'node:fs';
const p = 'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/lib/openai-api.js';
let s = fs.readFileSync(p, 'utf8');
const NL = String.fromCharCode(10);

// 处理 role: tool 消息
const oldLoop = [
  "    if (role === 'system') continue;",
  "    if (role === 'assistant') parts.push('[助手] ' + content);",
  "    else parts.push(content);"
].join(NL);

const newLoop = [
  "    if (role === 'system') continue;",
  "    if (role === 'assistant') { parts.push('[助手] ' + content); }",
  "    else if (role === 'tool') { parts.push('[工具返回结果] ' + content); }",
  "    else { parts.push(content); }"
].join(NL);

if (s.includes(oldLoop)) {
  s = s.replace(oldLoop, newLoop);
  fs.writeFileSync(p, s, 'utf8');
  fs.writeFileSync('C:/Users/Administrator/.cuckoo/plugins/ai-gateway/lib/openai-api.js', s, 'utf8');
  console.log('✅ openai-api.js 已支持 role: tool 拼接');
} else {
  console.log('❌ openai-api.js 未匹配到消息循环');
}