import fs from 'node:fs';
const dirs = [
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway',
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway',
];
for (const dir of dirs) {
  const p = dir + '/plugin.json';
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!j.config) j.config = {};
  if (!j.config.nativeMode) {
    j.config.nativeMode = {
      type: 'boolean',
      label: 'B 模式（平台原生）',
      description: '开启后不注入 Cuckoo 提示词，只发用户消息，让平台用自己的原生能力（深度思考/联网等）。代价：Cuckoo 工具全部不可用。',
      default: false,
    };
  }
  fs.writeFileSync(p, JSON.stringify(j, null, 2), 'utf8');
  console.log(dir.split('/').pop() + ' plugin.json 已加 nativeMode');
}
