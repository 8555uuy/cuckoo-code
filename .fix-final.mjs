import fs from 'node:fs';
const NL = String.fromCharCode(10);
const p = 'D:/cuckoo-code/src/app/subagent.ts';
const L = fs.readFileSync(p, 'utf8').split(NL);

// 1. 给 runGatewayQuery 签名加 noCuckooPrompt
for (let i = 250; i < 265; i++) {
  if (L[i] && L[i].includes('timeoutMs?: number;') && L[i + 1] && L[i + 1].includes('}): Promise<{ ok: boolean; text?: string; error?: string }>')) {
    L[i] = L[i] + ' // 保留原行尾';
    L.splice(i + 1, 0, '  /** B 模式：不注入 Cuckoo 提示词，平台原生回复 */', '  noCuckooPrompt?: boolean;');
    console.log('签名已加 noCuckooPrompt');
    break;
  }
}

// 2. 修 295 行附近：race 返回 unknown
for (let i = 285; i < 300; i++) {
  if (L[i] && L[i].includes('return { ok: true, text };')) {
    L[i] = L[i].replace('return { ok: true, text };', 'return { ok: true, text: String(text) };');
    console.log('text 类型已修');
    break;
  }
}

// 3. 修 278 行缺的换行（如果它没以 \r 结尾）
for (let i = 270; i < 282; i++) {
  if (L[i] && L[i].includes('isGateway:') && !L[i].endsWith('\r')) {
    L[i] = L[i] + '\r';
    console.log('278 行尾补齐');
    break;
  }
}

fs.writeFileSync(p, L.join(NL), 'utf8');
console.log('done');
