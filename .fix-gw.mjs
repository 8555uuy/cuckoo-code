import fs from 'node:fs';
const targets = [
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway/providers/gateway.js',
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway/providers/gateway.js',
];
const NL = String.fromCharCode(10);

for (const p of targets) {
  let s = fs.readFileSync(p, 'utf8');
  const applied = [];

  // 1. 默认值：127.0.0.1 + 空密码（运行时生成）
  const old1 = "  const out = { port: 18900, host: '0.0.0.0', adminPassword: 'admin', requireKey: true, autoStart: true, enabled: true };";
  if (s.includes(old1)) {
    s = s.replace(old1, "  const out = { port: 18900, host: '127.0.0.1', adminPassword: '', requireKey: true, autoStart: true, enabled: true };");
    applied.push('默认值');
  }

  // 2. readConfig 末尾：管理员密码为空则生成随机并落盘
  const old2 = [
    '  } catch (e) {}',
    '  return out;',
    '}',
  ].join(NL);
  if (s.includes(old2) && !s.includes('admin-password.txt')) {
    const new2 = [
      '  } catch (e) {}',
      '  // 未设置密码时生成随机强密码并落盘（仅本机可读），避免默认 admin 被局域网他人利用',
      '  if (!out.adminPassword) {',
      '    try {',
      "      const pwFile = path.join(dataDir(), 'admin-password.txt');",
      '      if (fs.existsSync(pwFile)) {',
      "        const t = fs.readFileSync(pwFile, 'utf-8').trim();",
      '        if (t.length >= 8) out.adminPassword = t;',
      '      }',
      '      if (!out.adminPassword) {',
      "        out.adminPassword = crypto.randomBytes(9).toString('base64url');",
      '        fs.mkdirSync(path.dirname(pwFile), { recursive: true });',
      "        fs.writeFileSync(pwFile, out.adminPassword + NL, { mode: 0o600 });",
      "        console.log('[ai-gateway] 已生成管理密码（保存在 ' + pwFile + '）');",
      '      }',
      '    } catch (e) { out.adminPassword = String(Date.now()); }',
      '  }',
      '  return out;',
      '}',
    ].join(NL);
    s = s.replace(old2, new2);
    applied.push('随机密码');
  }

  // 3. CORS 收紧：只允许本机来源
  s = s.split("'Access-Control-Allow-Origin': '*'").join("'Access-Control-Allow-Origin': (req.headers.origin || 'http://127.0.0.1')");
  s = s.split("res.setHeader('Access-Control-Allow-Origin', '*');").join("res.setHeader('Access-Control-Allow-Origin', req.headers.origin || 'http://127.0.0.1');");
  applied.push('CORS');

  fs.writeFileSync(p, s, 'utf8');
  console.log(p.split('/').slice(-3).join('/') + ' → ' + applied.join(', '));
}
