import fs from 'node:fs';
const p = 'D:/cuckoo-code/src/ui/shell/scripts/main.ts';
let s = fs.readFileSync(p, 'utf8');

// 删掉有毒的旧 import
s = s.replace(/import \{ loadMemories as MemoriesPage \}.*\r?\n/, '');
s = s.replace(/import \{ loadSnapshots as SnapshotsPage \}.*\r?\n/, '');

// 删掉覆盖注册的行
s = s.replace(/\s*registerPage\('memories', MemoriesPage as any\);/, '');
s = s.replace(/\s*registerPage\('snapshots', SnapshotsPage as any\);/, '');

fs.writeFileSync(p, s, 'utf8');
console.log('✅ 毒瘤已彻底切除');