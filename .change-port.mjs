import fs from 'node:fs';
import path from 'node:path';
const dirs = [
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway',
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway'
];

const files = [
  'providers/gateway.js',
  'ui/gateway-panel.js',
  'plugin.json'
];

for (const dir of dirs) {
  for (const f of files) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) continue;
    let s = fs.readFileSync(p, 'utf8');
    s = s.split('18900').join('18901');
    fs.writeFileSync(p, s, 'utf8');
    console.log('✅ 替换完成: ' + dir.split('/').pop() + '/' + f);
  }
}