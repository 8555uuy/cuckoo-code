import fs from 'node:fs';

// 白名单补 update-memory
const p = 'D:/cuckoo-code/src/app/ipc/plugin-control.ts';
let s = fs.readFileSync(p, 'utf8');
const anchor = "'list-memories', 'save-memories', 'add-memory', 'delete-memory',";
if (s.includes(anchor) && !s.includes("'update-memory'")) {
  s = s.replace(anchor, "'list-memories', 'save-memories', 'add-memory', 'update-memory', 'delete-memory',");
  fs.writeFileSync(p, s, 'utf8');
  console.log('OK 白名单补 update-memory');
} else { console.log('skip 白名单'); }
