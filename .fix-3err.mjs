import fs from 'node:fs';
const NL = String.fromCharCode(10);

// 1. ipc/project.ts：解构加 noCuckooPrompt
{
  const p = 'D:/cuckoo-code/src/app/ipc/project.ts';
  let s = fs.readFileSync(p, 'utf8');
  const old = "noDialog = false, parentSessionId = null }: any = {}) => {";
  const neu = "noDialog = false, parentSessionId = null, noCuckooPrompt = false }: any = {}) => {";
  if (s.includes(old)) {
    s = s.replace(old, neu);
    fs.writeFileSync(p, s, 'utf8');
    console.log('ipc/project OK');
  } else console.log('ipc/project MISS');
}

// 2. app/subagent.ts：修复 noCuckooPrompt 被拼进注释行
{
  const p = 'D:/cuckoo-code/src/app/subagent.ts';
  let s = fs.readFileSync(p, 'utf8');
  // 找到被拼坏的那行
  const broken = "    isGateway: true, // 纯用户消息（不加"任务"框架），让 AI 自由用工具    noCuckooPrompt: opts.noCuckooPrompt === true,";
  const fixed = [
    '    isGateway: true, // 纯用户消息（不加"任务"框架），让 AI 自由用工具',
    '    noCuckooPrompt: opts.noCuckooPrompt === true,',
  ].join(NL);
  if (s.includes(broken)) {
    s = s.replace(broken, fixed);
    console.log('subagent 拼接修复 OK');
  } else {
    // 尝试其他编码
    const broken2 = broken.replace(/\r/g, '');
    console.log('broken not found, will try split by line');
  }
  // 3. 函数签名加 noCuckooPrompt
  s = s.replace(
    '  onChunk?: (chunk: { think?: string; text?: string; done?: boolean }) => void;' + NL + '  timeoutMs?: number;',
    '  onChunk?: (chunk: { think?: string; text?: string; done?: boolean }) => void;' + NL + '  timeoutMs?: number;' + NL + '  noCuckooPrompt?: boolean;'
  );
  // 4. 修正 unknown 类型
  s = s.replace(
    '  } catch (err: any) {',
    '  } catch (err: any) {'
  );
  fs.writeFileSync(p, s, 'utf8');
}

// 5. 检查 subagent.ts 295 行附近
{
  const p = 'D:/cuckoo-code/src/app/subagent.ts';
  const L = fs.readFileSync(p, 'utf8').split(NL);
  console.log('=== 290-300 ===');
  for (let i = 289; i < 300 && i < L.length; i++) {
    console.log((i + 1) + ': ' + JSON.stringify(L[i]));
  }
}
