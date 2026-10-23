import fs from 'node:fs';
const p = 'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/lib/openai-api.js';
const L = fs.readFileSync(p, 'utf8').split(String.fromCharCode(10));
let done = false;
for (let i = 0; i < L.length; i++) {
  if (L[i] && L[i].includes("if (role === 'assistant') parts.push")) {
    const indent = L[i].match(/^\s*/)[0];
    L[i] = indent + "if (role === 'assistant') { parts.push('[助手] ' + content); }";
    // 检查下一行是不是 else parts.push
    if (L[i + 1] && L[i + 1].includes('else parts.push(content);')) {
      L[i + 1] = indent + "else if (role === 'tool') { parts.push('[工具返回结果] ' + content); }" + String.fromCharCode(10) + indent + 'else { parts.push(content); }';
    }
    done = true;
    break;
  }
}
if (done) {
  fs.writeFileSync(p, L.join(String.fromCharCode(10)), 'utf8');
  fs.writeFileSync('C:/Users/Administrator/.cuckoo/plugins/ai-gateway/lib/openai-api.js', L.join(String.fromCharCode(10)), 'utf8');
  console.log('✅ 已加 role: tool 处理');
} else {
  console.log('❌ 未找到匹配行');
}