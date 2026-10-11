/**
 * 管理网站 HTML（内联单页）
 * 功能：登录 / 状态 / Key 管理 / 请求日志
 */
function adminHtml() {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI 网关 · 控制台</title>
<style>
  :root{
    --bg:#0e1014;--surface:#161a20;--inset:#11151a;--border:#262c35;--border-soft:#1d222a;
    --text:#eef1f5;--text-2:#a8b0bb;--text-3:#6b7482;--text-4:#4d5561;
    --accent:#4c8dff;--accent-h:#5f9bff;--ok:#34d399;--err:#f87171;--warn:#fbbf24;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,'PingFang SC','Microsoft YaHei',sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.6;-webkit-font-smoothing:antialiased;min-height:100vh}
  a{color:var(--accent);text-decoration:none}
  .wrap{max-width:1000px;margin:0 auto;padding:28px 20px}
  header{display:flex;align-items:center;gap:12px;margin-bottom:24px}
  .logo{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#4c8dff,#3b6fd4);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#fff}
  h1{font-size:17px;font-weight:650;letter-spacing:-.01em}
  .sub{font-size:12px;color:var(--text-3)}
  .spacer{flex:1}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px}
  .card h2{font-size:14px;font-weight:600;margin-bottom:14px;letter-spacing:-.01em}
  .btn{font-family:inherit;font-size:13px;font-weight:520;border-radius:8px;padding:8px 14px;border:1px solid transparent;cursor:pointer;transition:background-color .15s ease-out,color .15s ease-out,border-color .15s ease-out}
  .btn:disabled{opacity:.45;cursor:not-allowed}
  .btn.pri{background:var(--accent);color:#fff}
  .btn.pri:hover:not(:disabled){background:var(--accent-h)}
  .btn.ghost{background:transparent;border-color:var(--border);color:var(--text-2)}
  .btn.ghost:hover:not(:disabled){background:#1e242c;color:var(--text)}
  .btn.danger{background:transparent;border-color:#3d2a2e;color:var(--err)}
  .btn.danger:hover:not(:disabled){background:#2a1a1d}
  .btn.sm{padding:5px 10px;font-size:12px;border-radius:6px}
  input,select{font-family:inherit;font-size:13px;background:var(--inset);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:9px 12px;width:100%}
  input:focus,select:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(76,141,255,.14)}
  label{display:block;font-size:12px;color:var(--text-3);margin-bottom:6px;font-weight:500}
  .row{display:flex;gap:10px;align-items:flex-end}
  .row>*{flex:1}
  .row>.shrink{flex:0 0 auto}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;font-weight:520;color:var(--text-3);font-size:12px;padding:8px 10px;border-bottom:1px solid var(--border-soft)}
  td{padding:9px 10px;border-bottom:1px solid var(--border-soft);color:var(--text-2)}
  tr:last-child td{border-bottom:none}
  .mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px}
  .badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:520;padding:2px 9px;border-radius:20px}
  .badge.on{background:rgba(52,211,153,.12);color:var(--ok)}
  .badge.off{background:rgba(107,116,130,.15);color:var(--text-3)}
  .dot{width:6px;height:6px;border-radius:50%}
  .dot.on{background:var(--ok)}.dot.off{background:var(--text-4)}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
  .stat{background:var(--inset);border:1px solid var(--border-soft);border-radius:10px;padding:14px}
  .stat .k{font-size:11px;color:var(--text-3);margin-bottom:5px}
  .stat .v{font-size:19px;font-weight:640;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
  .key-box{display:flex;gap:8px;align-items:center}
  .key-box code{flex:1;background:var(--inset);border:1px solid var(--border);border-radius:7px;padding:7px 10px;font-family:ui-monospace,Consolas,monospace;font-size:12px;color:#7dd3fc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .muted{color:var(--text-3);font-size:12px}
  .hidden{display:none !important}
  .toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(10px);background:#212832;border:1px solid var(--border);color:var(--text);padding:9px 18px;border-radius:9px;font-size:13px;opacity:0;pointer-events:none;transition:opacity .2s ease-out,transform .2s ease-out;z-index:99}
  .toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
  .login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .login-card{width:100%;max-width:360px}
  .empty{text-align:center;color:var(--text-3);padding:32px 0;font-size:13px}
</style></head><body>

<!-- 登录 -->
<div id="login" class="login-wrap">
  <div class="card login-card">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <div class="logo">G</div>
      <div><div style="font-size:15px;font-weight:650">AI 网关</div><div class="sub">管理控制台</div></div>
    </div>
    <label>管理密码</label>
    <input id="pw" type="password" placeholder="输入管理密码" autocomplete="current-password">
    <button class="btn pri" id="loginBtn" style="width:100%;margin-top:14px;padding:10px">登录</button>
  </div>
</div>

<!-- 主界面 -->
<div id="app" class="wrap hidden">
  <header>
    <div class="logo">G</div>
    <div><h1>AI 网关</h1><div class="sub" id="endpointHint">—</div></div>
    <div class="spacer"></div>
    <button class="btn ghost sm" id="logoutBtn">退出</button>
  </header>

  <div class="card">
    <h2>状态</h2>
    <div class="stats" id="stats"></div>
  </div>

  <div class="card">
    <h2>API Key</h2>
    <div class="row" style="margin-bottom:14px">
      <div><label>备注（可选）</label><input id="newKeyNote" placeholder="如：我的手机"></div>
      <button class="btn pri shrink" id="createKeyBtn">创建 Key</button>
    </div>
    <div id="keysArea"></div>
  </div>

  <div class="card">
    <h2>客户端配置示例</h2>
    <p class="muted" style="margin-bottom:10px">任何支持 OpenAI API 的客户端，填以下配置即可：</p>
    <div class="key-box"><code id="usageBase">—</code><button class="btn ghost sm" data-copy="usageBase">复制</button></div>
    <p class="muted" style="margin-top:10px">API Key 填上面创建的 Key。模型名填 <code style="color:#7dd3fc">cuckoo-default</code>。</p>
  </div>

  <div class="card">
    <h2>最近请求</h2>
    <div id="logsArea"></div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
var TOKEN = localStorage.getItem('cuckoo-gw-token') || '';
function \$(id){return document.getElementById(id)}
function toast(m){var t=\$('toast');t.textContent=m;t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2000)}
function api(path, opts){
  opts = opts || {};
  opts.headers = Object.assign({'Content-Type':'application/json','X-Admin-Token':TOKEN}, opts.headers||{});
  return fetch(path, opts).then(function(r){return r.json()});
}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function fmtTime(ts){ if(!ts) return '—'; var d=new Date(ts); var p=function(n){return n<10?'0'+n:n}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes()) }

function showLogin(){ \$('login').classList.remove('hidden'); \$('app').classList.add('hidden') }
function showApp(){ \$('login').classList.add('hidden'); \$('app').classList.remove('hidden') }

function doLogin(){
  var pw = \$('pw').value;
  if(!pw){ toast('请输入密码'); return }
  \$('loginBtn').disabled = true;
  fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})})
    .then(function(r){return r.json()}).then(function(r){
      \$('loginBtn').disabled = false;
      if(r.success){ TOKEN = r.token; localStorage.setItem('cuckoo-gw-token', TOKEN); showApp(); loadAll(); }
      else toast(r.error || '登录失败');
    }).catch(function(){ \$('loginBtn').disabled=false; toast('登录失败') });
}

function loadStats(){
  api('/api/stats').then(function(s){
    if(!s || s.running === undefined) return;
    \$('endpointHint').textContent = (s.host||'') + ':' + (s.port||'') + ' · ' + (s.hasAIPage?'AI 页面就绪':'等待 AI 窗口');
    \$('stats').innerHTML = [
      ['运行状态', s.running ? '<span class="badge on"><span class="dot on"></span>运行中</span>' : '<span class="badge off"><span class="dot off"></span>已停止</span>'],
      ['监听地址', esc((s.host||'')+':'+(s.port||''))],
      ['要求 Key', s.requireKey ? '是' : '否'],
      ['总请求', s.totalCalls||0],
      ['AI 页面', s.hasAIPage ? '就绪' : '未就绪'],
    ].map(function(x){return '<div class="stat"><div class="k">'+x[0]+'</div><div class="v" style="font-size:14px">'+x[1]+'</div></div>'}).join('');
    var base = 'http://' + location.host + '/v1';
    \$('usageBase').textContent = base;
  }).catch(function(){});
}

function loadKeys(){
  api('/api/keys').then(function(r){
    if(!r || !r.keys){ if(r && r.error) { showLogin(); } return }
    var area = \$('keysArea');
    if(!r.keys.length){ area.innerHTML = '<div class="empty">还没有 Key，创建一个开始使用</div>'; return }
    area.innerHTML = '<table><thead><tr><th>Key</th><th>备注</th><th>状态</th><th>调用</th><th>创建</th><th></th></tr></thead><tbody>' +
      r.keys.map(function(k){
        return '<tr>' +
          '<td><code class="mono" style="color:#7dd3fc">'+esc(k.key.slice(0,14))+'…</code></td>' +
          '<td>'+esc(k.note||'—')+'</td>' +
          '<td>'+(k.enabled?'<span class="badge on"><span class="dot on"></span>启用</span>':'<span class="badge off"><span class="dot off"></span>停用</span>')+'</td>' +
          '<td class="mono">'+(k.calls||0)+'</td>' +
          '<td class="muted">'+fmtTime(k.createdAt)+'</td>' +
          '<td style="text-align:right;white-space:nowrap">' +
            '<button class="btn ghost sm" data-copy-key="'+esc(k.key)+'">复制</button> ' +
            '<button class="btn ghost sm" data-toggle="'+esc(k.key)+'" data-en="'+(k.enabled?'0':'1')+'">'+(k.enabled?'停用':'启用')+'</button> ' +
            '<button class="btn danger sm" data-del="'+esc(k.key)+'">删除</button>' +
          '</td>' +
        '</tr>';
      }).join('') + '</tbody></table>';
    area.querySelectorAll('[data-del]').forEach(function(b){ b.onclick=function(){ delKey(b.dataset.del) } });
    area.querySelectorAll('[data-toggle]').forEach(function(b){ b.onclick=function(){ toggleKey(b.dataset.toggle, b.dataset.en==='1') } });
    area.querySelectorAll('[data-copy-key]').forEach(function(b){ b.onclick=function(){ copy(b.dataset.copyKey); toast('已复制 Key') } });
  }).catch(function(){});
}

function loadLogs(){
  api('/api/logs').then(function(r){
    if(!r || !r.logs) return;
    var area = \$('logsArea');
    if(!r.logs.length){ area.innerHTML = '<div class="empty">暂无请求</div>'; return }
    area.innerHTML = '<table><thead><tr><th>时间</th><th>类型</th><th>模型</th><th>长度</th><th>结果</th></tr></thead><tbody>' +
      r.logs.slice(0,20).map(function(l){
        var ok = l.ok === true ? '<span style="color:var(--ok)">成功</span>' : (l.ok === false ? '<span style="color:var(--err)">失败</span>' : '—');
        return '<tr><td class="muted">'+fmtTime(l.at)+'</td><td>'+esc(l.type||'')+'</td><td class="mono">'+esc(l.model||'—')+'</td><td class="mono">'+esc(l.replyLen||l.len||'—')+'</td><td>'+ok+(l.error?' <span class="muted">'+esc(l.error)+'</span>':'')+'</td></tr>';
      }).join('') + '</tbody></table>';
  }).catch(function(){});
}

function createKey(){
  var note = \$('newKeyNote').value;
  api('/api/keys', { method:'POST', body: JSON.stringify({note:note}) }).then(function(r){
    if(r && r.success){ \$('newKeyNote').value=''; toast('Key 已创建'); loadKeys(); }
    else toast((r&&r.error)||'创建失败');
  });
}
function delKey(key){
  if(!confirm('确定删除这个 Key？使用它的客户端将立即失效。')) return;
  api('/api/keys/'+encodeURIComponent(key), { method:'DELETE' }).then(function(r){ if(r&&r.success){toast('已删除');loadKeys()}else toast('删除失败') });
}
function toggleKey(key, enabled){
  api('/api/keys/'+encodeURIComponent(key)+'/toggle', { method:'POST', body: JSON.stringify({enabled:enabled}) }).then(function(r){ if(r&&r.success){toast('已更新');loadKeys()}else toast('更新失败') });
}
function copy(s){ try{ navigator.clipboard.writeText(s) }catch(e){ var t=document.createElement('textarea');t.value=s;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove() } }

function loadAll(){ loadStats(); loadKeys(); loadLogs(); }

\$('loginBtn').onclick = doLogin;
\$('pw').addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin() });
\$('createKeyBtn').onclick = createKey;
\$('logoutBtn').onclick = function(){ TOKEN=''; localStorage.removeItem('cuckoo-gw-token'); showLogin() };
document.querySelectorAll('[data-copy]').forEach(function(b){ b.onclick=function(){ copy(\$(b.dataset.copy).textContent); toast('已复制') } });

// 启动
if(TOKEN){ showApp(); loadAll(); setInterval(function(){ if(!\$('app').classList.contains('hidden')) loadAll() }, 5000); }
else showLogin();
</script></body></html>`;
}
module.exports = { adminHtml };
