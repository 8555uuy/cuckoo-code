import fs from 'node:fs';
const p = 'D:/cuckoo-code/src/tools/index.ts';
let s = fs.readFileSync(p, 'utf8');
const anchor = 'registry.register(new ForgetMemoryTool());';
if (!s.includes('new UpdateMemoryTool()')) {
  const eol = s.includes(String.fromCharCode(13)) ? String.fromCharCode(13) + String.fromCharCode(10) : String.fromCharCode(10);
  s = s.replace(anchor, anchor + eol + '  registry.register(new UpdateMemoryTool());');
  fs.writeFileSync(p, s, 'utf8');
  console.log('已补注册');
} else {
  console.log('已存在');
}
