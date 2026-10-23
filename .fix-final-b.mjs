import fs from 'node:fs';

// 1. 同步 openai-api.js
const src = 'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/lib/openai-api.js';
const dst = 'C:/Users/Administrator/.cuckoo/plugins/ai-gateway/lib/openai-api.js';
fs.copyFileSync(src, dst);
console.log('✅ openai-api.js 已同步');

// 2. 修 package.json 重复 version
const pkg = 'D:/cuckoo-code/package.json';
const L = fs.readFileSync(pkg, 'utf8').split(String.fromCharCode(10));
let found = false;
for (let i = 0; i < L.length; i++) {
  if (L[i].includes('"version": "0.8.17"') && !found) {
    L.splice(i, 1);
    found = true;
    console.log('✅ package.json 已删除重复的 version 0.8.17');
    break;
  }
}
fs.writeFileSync(pkg, L.join(String.fromCharCode(10)), 'utf8');

// 3. 验证 JSON 合法
const raw = fs.readFileSync(pkg, 'utf8');
JSON.parse(raw);
console.log('✅ package.json JSON 合法');