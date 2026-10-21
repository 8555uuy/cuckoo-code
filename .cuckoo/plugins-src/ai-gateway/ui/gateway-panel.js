/** AI 网关 —— 侧边栏面板（ui 插件） */
export const name = 'ai-gateway-panel';

const PLUGIN_ID = 'ai-gateway';
const DEFAULT_PORT = 18900;

const CSS = [
  '.ck-gw-wrap{padding:12px}',
  '.ck-gw-hero{display:flex;align-items:center;gap:8px;margin-bottom:12px}',
  '.ck-gw-title{font-size:13px;font-weight:600;color:var(--ck-text);flex:1}',
  '.ck-gw-badge{font-size:11px;font-weight:500;padding:2px 9px;border-radius:20px;white-space:nowrap}',
  '.ck-gw-badge.on{background:rgba(52,211,153,.14);color:#34d399}',
  '.ck-gw-badge.off{background:rgba(107,116,130,.16);color:var(--ck-text-dim)}',
  '.ck-gw-badge.err{background:rgba(248,113,113,.14);color:#f87171}',
  '.ck-gw-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)}',
  '.ck-gw-row:last-of-type{border-bottom:none}',
  '.ck-gw-k{color:var(--ck-text-dim);font-size:12px;flex-shrink:0}',
  '.ck-gw-v{font-family:ui-monospace,Consolas,monospace;font-size:11.5px;color:#7dd3fc;text-align:right;word-break:break-all;line-height:1.4}',
  '.ck-gw-actions{display:flex;gap:8px;margin-top:12px}',
  '.ck-gw-btn{flex:1;font-family:inherit;font-size:12px;font-weight:500;padding:8px 10px;border-radius:7px;border:1px solid transparent;cursor:pointer}',
  '.ck-gw-btn.pri{background:#4c8dff;color:#fff}',
  '.ck-gw-btn.ghost{background:transparent;border-color:rgba(255,255,255,.14);color:var(--ck-text-dim)}',
  '.ck-gw-toggle{display:flex;align-items:center;gap:8px;margin:10px 0 2px;font-size:12px;color:var(--ck-text);cursor:pointer}',
  '.ck-gw-prank{margin-top:12px;width:100%;font-family:inherit;font-size:12px;font-weight:600;padding:9px 10px;border-radius:8px;border:1px dashed rgba(251,191,36,.45);background:rgba(251,191,36,.06);color:#fbbf24;cursor:pointer;transition:background .15s,color .15s,border-color .15s}',
  '.ck-gw-prank:hover{background:rgba(251,191,36,.12)}',
  '.ck-gw-prank.armed{border-style:solid;border-color:#f87171;background:rgba(248,113,113,.14);color:#f87171}',
  '.ck-gw-prank.on{border-style:solid;border-color:#f87171;background:#f87171;color:#1b1e23}',
  '.ck-gw-hint{margin-top:6px;font-size:11px;color:var(--ck-text-dim);line-height:1.5}',
].join('');

// 面板在壳页面：走 shellAPI.pluginHostCall（IPC）拿数据——不用 fetch（file:// 访问 127.0.0.1 会被拦）
const POLL = '(function(){' +
  'var PID="ai-gateway";var DEF_PORT=' + DEFAULT_PORT + ';' +
  'function g(id){return document.getElementById(id)}' +
  'function setStatus(on,text){var st=g("gw-status");if(st){st.textContent=text;st.className="ck-gw-badge "+(on?"on":"off");}}' +
  'function fill(s){' +
    'var port=s.port||DEF_PORT;' +
    'var ip=(s.lanIPs&&s.lanIPs[0])?s.lanIPs[0].ip:null;' +
    'var a=g("gw-lan");if(a)a.textContent=ip?("http://"+ip+":"+port):"-";' +
    'var api=g("gw-api");if(api)api.textContent=ip?("http://"+ip+":"+port+"/v1"):"-";' +
    'var loc=g("gw-local");if(loc)loc.textContent="http://127.0.0.1:"+port+"/";' +
    'var on=(s.running&&s.enabled!==false);' +
    'setStatus(on,on?"运行中":(s.enabled===false?"已关闭":"已停止"));' +
    'var k=g("gw-keys");if(k)k.textContent=s.keyCount||0;' +
    'var c=g("gw-calls");if(c)c.textContent=s.totalCalls||0;' +
    'var tg=g("gw-toggle");if(tg&&document.activeElement!==tg)tg.checked=s.enabled!==false;' +
    'var pb=g("gw-prank");if(pb&&!pb.__armed)pb.className="ck-gw-prank"+(s.prankMode?" on":"");' +
  '}' +
  'function poll(){' +
    'if(!window.shellAPI||!window.shellAPI.pluginHostCall){setStatus(false,"接口不可用");return}' +
    'window.shellAPI.pluginHostCall(PID,"stats").then(function(r){if(r&&r.success&&r.data)fill(r.data);else setStatus(false,"未就绪")}).catch(function(){setStatus(false,"未连接")})' +
  '}' +
  'window.__gwOpen=function(){try{window.shellAPI.openExternal("http://127.0.0.1:"+DEF_PORT+"/")}catch(e){}};' +
  'window.__gwCopy=function(){var t=g("gw-lan").textContent;try{navigator.clipboard.writeText(t)}catch(e){}};' +
  'window.__gwToggle=function(on){' +
    'setStatus(!!on,on?"启动中…":"关闭中…");' +
    'if(window.shellAPI&&window.shellAPI.pluginHostCall){window.shellAPI.pluginHostCall(PID,"toggle",{enabled:!!on}).catch(function(){})}' +
    'setTimeout(poll,1200);' +
  '};' +
  'window.__gwPrank=function(){' +
    'var b=g("gw-prank");if(!b)return;' +
    'var on=b.className.indexOf("on")>=0;' +
    'if(!b.__armed&&!on){' +
      'b.__armed=1;b.className="ck-gw-prank armed";b.textContent="确定要整活？再点一次";' +
      'var h=g("gw-hint");if(h)h.textContent="开启后，不管问啥都只回一句整活话。";' +
      'setTimeout(function(){if(b.__armed){b.__armed=0;b.className="ck-gw-prank";b.textContent="整活模式";var h2=g("gw-hint");if(h2)h2.textContent="";}},4000);' +
      'return;' +
    '}' +
    'b.__armed=0;' +
    'var want=!on;' +
    'b.className="ck-gw-prank"+(want?" on":"");b.textContent=want?"整活模式（已开启）":"整活模式";' +
    'var h3=g("gw-hint");if(h3)h3.textContent=want?"不管问啥，只回：哈吉米哦南北绿豆…":"";' +
    'if(window.shellAPI&&window.shellAPI.pluginHostCall){window.shellAPI.pluginHostCall(PID,"prank",{enabled:want}).catch(function(){})}' +
    'setTimeout(poll,1000);' +
  '};' +
  'poll();if(!window.__gwPollTimer)window.__gwPollTimer=setInterval(poll,4000);' +
'})()';

const HTML = [
  '<div class="ck-gw-wrap">',
    '<div class="ck-gw-hero"><div class="ck-gw-title">AI 网关</div><div class="ck-gw-badge off" id="gw-status">连接中…</div></div>',
    '<label class="ck-gw-toggle"><input type="checkbox" id="gw-toggle" onchange="window.__gwToggle&&window.__gwToggle(this.checked)"> 启用网关</label>',
    '<div class="ck-gw-row"><span class="ck-gw-k">局域网</span><code class="ck-gw-v" id="gw-lan">-</code></div>',
    '<div class="ck-gw-row"><span class="ck-gw-k">本机</span><code class="ck-gw-v" id="gw-local">-</code></div>',
    '<div class="ck-gw-row"><span class="ck-gw-k">API 端点</span><code class="ck-gw-v" id="gw-api">-</code></div>',
    '<div class="ck-gw-row"><span class="ck-gw-k">Key 数</span><code class="ck-gw-v" id="gw-keys">0</code></div>',
    '<div class="ck-gw-row"><span class="ck-gw-k">总请求</span><code class="ck-gw-v" id="gw-calls">0</code></div>',
    '<div class="ck-gw-actions">',
      '<button class="ck-gw-btn pri" onclick="window.__gwOpen&&window.__gwOpen()">管理网站</button>',
      '<button class="ck-gw-btn ghost" onclick="window.__gwCopy&&window.__gwCopy()">复制地址</button>',
    '</div>',
    '<button class="ck-gw-prank" id="gw-prank" onclick="window.__gwPrank&&window.__gwPrank()">整活模式</button>',
    '<div class="ck-gw-hint" id="gw-hint"></div>',
    '<img src="x" style="width:0;height:0;position:absolute;opacity:0" onerror="' + POLL.replace(/"/g, '&quot;') + '">',
  '</div>',
].join('');

export function apply(ctx) {
  try {
    if (ctx.ui && ctx.ui.shell && typeof ctx.ui.shell.addStyle === 'function') {
      ctx.ui.shell.addStyle(CSS);
    }
    if (ctx.ui && ctx.ui.shell && typeof ctx.ui.shell.addSidebarPanel === 'function') {
      ctx.ui.shell.addSidebarPanel({ id: 'ai-gateway', title: 'AI 网关', icon: '<svg class="ck-ab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg>', html: HTML }).then(function () {
        ctx.log('网关面板已挂载');
      }).catch(function (e) { ctx.log('挂载失败: ' + (e && e.message)); });
    }
  } catch (e) { ctx.log('面板出错: ' + (e && e.message)); }
}
