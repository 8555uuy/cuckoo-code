import fs from 'node:fs';
const NL = String.fromCharCode(10);

// 1. ipc/project.ts
{
  const p = 'D:/cuckoo-code/src/app/ipc/project.ts';
  const L = fs.readFileSync(p, 'utf8').split(NL);
  let done = false;
  for (let i = 0; i < L.length; i++) {
    if (L[i].includes('parentSessionId = null }: any = {})')) {
      L[i] = L[i].replace('parentSessionId = null }: any = {})', 'parentSessionId = null, noCuckooPrompt = false }: any = {})');
      done = true;
      break;
    }
  }
  fs.writeFileSync(p, L.join(NL), 'utf8');
  console.log('ipc/project: ' + (done ? 'OK' : 'MISS'));
}

// 2. app/subagent.ts
{
  const p = 'D:/cuckoo-code/src/app/subagent.ts';
  const L = fs.readFileSync(p, 'utf8').split(NL);
  let fixed = false;
  for (let i = 0; i < L.length; i++) {
    // 找被拼坏的行：包含 isGateway 和 noCuckooPrompt 在同一行
    if (L[i].includes('isGateway:') && L[i].includes('noCuckooPrompt:')) {
      // 拆成两行
      L.splice(i, 1,
        '    isGateway: true, // 纯用户消息',
        '    noCuckooPrompt: opts.noCuckooPrompt === true,'
      );
      fixed = true;
      break;
    }
  }
  console.log('subagent line merge: ' + (fixed ? 'OK' : 'MISS'));
  fs.writeFileSync(p, L.join(NL), 'utf8');
}

// 3. 读当前 250-300 看签名
{
  const p = 'D:/cuckoo-code/src/app/subagent.ts';
  const L = fs.readFileSync(p, 'utf8').split(NL);
  console.log('=== 253-280 ===');
  for (let i = 252; i < 280 && i < L.length; i++) {
    console.log((i + 1) + ': ' + JSON.stringify(L[i]));
  }
  console.log('=== 290-300 ===');
  for (let i = 289; i < 300 && i < L.length; i++) {
    console.log((i + 1) + ': ' + JSON.stringify(L[i]));
  }
}
