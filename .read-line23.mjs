import fs from 'node:fs';
const NL = String.fromCharCode(10);
const L = fs.readFileSync('D:/cuckoo-code/src/app/ipc/project.ts', 'utf8').split(NL);
console.log('23: ' + JSON.stringify(L[22]));
