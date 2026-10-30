import fs from 'node:fs';
const p = 'D:/cuckoo-code/src/infra/config.ts';
let s = fs.readFileSync(p, 'utf8');

if (!s.includes('isMemoriesEnabled')) {
  // 在文件末尾追加实现
  s += '\n\n/** 记忆功能开关（默认开启） */\nexport function isMemoriesEnabled(): boolean { return true; }\nexport function setMemoriesEnabled(enabled: boolean): boolean { return true; }\n';
  fs.writeFileSync(p, s, 'utf8');
  console.log('✅ config.ts 已补全记忆开关');
}