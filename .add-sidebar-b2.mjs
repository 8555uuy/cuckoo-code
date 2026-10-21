import fs from 'node:fs';
const NL = String.fromCharCode(10);
const dirs = [
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway',
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway',
];

for (const dir of dirs) {
  const p = dir + '/ui/gateway-panel.js';
  let s = fs.readFileSync(p, 'utf8');
  let n = 0;

  // 1. POLL 里：找 gw-prank 的更新行，在其后加 gw-native
  const lines = s.split(NL);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('gw-prank') && lines[i].includes('prankMode') && !lines[i].includes('gw-native')) {
      // 提取缩进
      const m = lines[i].match(/^(\s*)/);
      const indent = m ? m[1] : '    ';
      // 这行在字符串拼接里，需要注意前缀是 + 还是 '
      // 简单做法：在下一行插入一段同样的 JS 片段
      lines.splice(i + 1, 0,
        indent + "var nb=g(\"gw-native\");if(nb){var non=!!s.nativeMode;nb.className=\"ck-gw-prank\"+(non?\" on\":\"\");nb.textContent=non?\"B模式已开\":\"B模式\";}"
      );
      n++;
      break;
    }
  }
  s = lines.join(NL);

  // 2. 加 __gwNative 函数（找 __gwPrank 定义）
  const fnAnchor = 'window.__gwPrank=function(){';
  if (s.includes(fnAnchor) && !s.includes('__gwNative')) {
    const fn = [
      'window.__gwNative=function(){',
      '  var nb=g("gw-native");if(!nb)return;',
      '  var on=nb.className.indexOf("on")>=0;',
      '  var want=!on;',
      '  nb.className="ck-gw-prank"+(want?" on":"");',
      '  nb.textContent=want?"B模式已开":"B模式";',
      '  if(window.shellAPI&&window.shellAPI.pluginHostCall){window.shellAPI.pluginHostCall(PID,"native",{enabled:want}).catch(function(){})}',
      '  setTimeout(poll,1000);',
      '};',
      '',
    ].join(NL);
    s = s.replace(fnAnchor, fn + fnAnchor);
    n++;
  }

  fs.writeFileSync(p, s, 'utf8');
  console.log(dir.split('/').pop() + ': 修 ' + n + ' 处');
}
