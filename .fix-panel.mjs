import fs from 'node:fs';
const NL = String.fromCharCode(10);
const CR = '\r';
const dirs = [
  'C:/Users/Administrator/.cuckoo/plugins/ai-gateway',
  'D:/cuckoo-code/.cuckoo/plugins-src/ai-gateway',
];

for (const dir of dirs) {
  const p = dir + '/ui/gateway-panel.js';
  const L = fs.readFileSync(p, 'utf8').split(NL);
  let n = 0;

  // 1. 修第 48 行（0-based 47）：改成合法字符串拼接
  for (let i = 0; i < L.length; i++) {
    if (L[i] && L[i].includes('var nb=g(\"gw-native\")') && !L[i].trim().startsWith("'")) {
      const indent = L[i].match(/^(\s*)/)[1];
      L[i] = indent + "    'var nb=g(\"gw-native\");if(nb){var non=!!s.nativeMode;nb.className=\"ck-gw-prank\"+(non?\" on\":\"\");nb.textContent=non?\"B模式已开\":\"B模式\";}' +";
      n++;
      break;
    }
  }

  // 2. 在 __gwPrank 之前插入 __gwNative
  for (let i = 0; i < L.length; i++) {
    if (L[i] && L[i].includes('window.__gwPrank=function(){') && !L[i + 1] && false) { /* noop */ }
  }
  if (!L.some((x) => x && x.includes('__gwNative=function'))) {
    for (let i = 0; i < L.length; i++) {
      if (L[i] && L[i].includes("'window.__gwPrank=function(){' +")) {
        const indent = L[i].match(/^(\s*)/)[1];
        const block = [
          indent + "  'window.__gwNative=function(){' +",
          indent + '    \'var nb=g("gw-native");if(!nb)return;\' +',
          indent + "    'var on=nb.className.indexOf(\"on\")>=0;' +",
          indent + "    'var want=!on;' +",
          indent + "    'nb.className=\"ck-gw-prank\"+(want?\" on\":\"\");' +",
          indent + "    'nb.textContent=want?\"B模式已开\":\"B模式\";' +",
          indent + "    'if(window.shellAPI&&window.shellAPI.pluginHostCall){window.shellAPI.pluginHostCall(PID,\"native\",{enabled:want}).catch(function(){})}' +",
          indent + "    'setTimeout(poll,1000);' +",
          indent + "  '};' +",
        ];
        L.splice(i, 0, ...block);
        n++;
        break;
      }
    }
  }

  fs.writeFileSync(p, L.join(NL), 'utf8');
  console.log(dir.split('/').pop() + ': 修 ' + n + ' 处');
}
