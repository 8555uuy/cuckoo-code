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

  // 1. HTML 里在整活模式按钮后加 B 模式按钮
  const anchorHtml = "'<button class=\"ck-gw-prank\" id=\"gw-prank\" onclick=\"window.__gwPrank&&window.__gwPrank()\">整活模式</button>',";
  if (s.includes(anchorHtml) && !s.includes('gw-native')) {
    const insert = [
      anchorHtml,
      "    '<button class=\"ck-gw-prank\" id=\"gw-native\" onclick=\"window.__gwNative&&window.__gwNative()\">B 模式（平台原生）</button>',",
    ].join(NL);
    s = s.replace(anchorHtml, insert);
    n++;
  }

  // 2. POLL 里读取 nativeMode 并更新按钮
  const anchorPoll = "var pb=g(\"gw-prank\");if(pb&&!pb.__armed)pb.className=\"ck-gw-prank\"+(s.prankMode?\" on\":\"\");";
  if (s.includes(anchorPoll) && !s.includes('gw-native')) {
    const insert = [
      anchorPoll,
      "var nb=g(\"gw-native\");if(nb){var on=!!s.nativeMode;nb.className=\"ck-gw-prank\"+(on?\" on\":\"\");nb.textContent=on?\"B 模式（已开启）\":\"B 模式（平台原生）\";}",
    ].join(NL);
    s = s.replace(anchorPoll, insert);
    n++;
  }

  // 3. window.__gwNative 函数
  const anchorFn = 'window.__gwPrank=function(){';
  if (s.includes(anchorFn) && !s.includes('__gwNative')) {
    const fnBody = [
      'window.__gwNative=function(){',
      '  var nb=g("gw-native");if(!nb)return;',
      '  var on=nb.className.indexOf("on")>=0;',
      '  var want=!on;',
      '  nb.className="ck-gw-prank"+(want?" on":"");',
      '  nb.textContent=want?"B 模式（已开启）":"B 模式（平台原生）";',
      '  var h=g("gw-hint");if(h)h.textContent=want?"不注入 Cuckoo 提示词，平台原生回复（Cuckoo 工具不可用）":"";',
      '  if(window.shellAPI&&window.shellAPI.pluginHostCall){window.shellAPI.pluginHostCall(PID,"native",{enabled:want}).catch(function(){})}',
      '  setTimeout(poll,1000);',
      '};',
      '',
    ].join(NL);
    s = s.replace(anchorFn, fnBody + anchorFn);
    n++;
  }

  fs.writeFileSync(p, s, 'utf8');
  console.log(dir.split('/').pop() + ': 修 ' + n + ' 处');
}
