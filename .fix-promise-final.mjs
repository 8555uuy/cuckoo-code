import fs from 'node:fs';
const NL = String.fromCharCode(10);

// 直接完全重写 main.ts 中的注册区块，清理所有旧的 async 函数注册
const pMain = 'D:/cuckoo-code/src/ui/shell/scripts/main.ts';
let main = fs.readFileSync(pMain, 'utf8');

// 删掉所有旧的 loadMemories 和 loadSnapshots 的 import
main = main.replace(/import \{ loadMemories.*\}\s*from\s*'.*';?/g, '');
main = main.replace(/import \{ loadSnapshots.*\}\s*from\s*'.*';?/g, '');

// 删掉所有可能注册了 Promise 的 registerPage
main = main.replace(/registerPage\('memories',\s*loadMemories.*?\);/g, '');
main = main.replace(/registerPage\('snapshots',\s*loadSnapshots.*?\);/g, '');

// 确保最后只注册了 React 组件
if (!main.includes("registerPage('memories', MemoriesReact)")) {
  main = main.replace("  registerPage('feishu', FeishuPage);", "  registerPage('feishu', FeishuPage);" + NL + "  registerPage('memories', MemoriesReact);" + NL + "  registerPage('snapshots', SnapshotsReact);");
}

fs.writeFileSync(pMain, main, 'utf8');
console.log('✅ 已彻底清理 main.ts 的旧注册逻辑');