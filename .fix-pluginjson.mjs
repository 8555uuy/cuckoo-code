import fs from 'node:fs';
const dirs = [
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway',
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway',
];
for (const dir of dirs) {
  const p = dir + '/plugin.json';
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (j.config) {
    if (j.config.host) {
      j.config.host.default = '127.0.0.1';
      j.config.host.description = '127.0.0.1 = 仅本机（推荐）；0.0.0.0 = 局域网可访问（有安全风险）';
    }
    if (j.config.adminPassword) {
      j.config.adminPassword.default = '';
      j.config.adminPassword.description = '管理网站登录密码；留空则首次启动自动生成随机密码并保存到插件数据目录的 admin-password.txt';
    }
  }
  fs.writeFileSync(p, JSON.stringify(j, null, 2), 'utf8');
  console.log('已更新 ' + dir.split('/').pop() + ' plugin.json');
}
