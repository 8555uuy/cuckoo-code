/**
 * AI 网关 —— 插件可执行入口（providers/gateway.js）
 *
 * 把 Cuckoo 的 AI 网页版暴露成 OpenAI 兼容 API（局域网可访问），附管理网站。
 *
 * 路由：
 *   POST /v1/chat/completions   聊天补全（流式 + 非流式）
 *   GET  /v1/models             模型列表
 *   GET  /                      管理网站
 *   POST /api/login             管理登录
 *   GET  /api/stats             状态
 *   GET  /api/keys              列出 key（需登录）
 *   POST /api/keys              创建 key
 *   DELETE /api/keys/:key       删除 key
 *   POST /api/keys/:key/toggle  启停 key
 *   GET  /api/logs              请求日志
 *
 * 复用 mcp-tunnel 的模式：动态 import Cuckoo 编译后的 window.js 拿 AI 页面。
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { getAIWebContents, getProjectDir, getParentWindowId } = require('../lib/ai-driver.js');
const { messagesToText, chatCompletion, streamChunk, sseLine } = require('../lib/openai-api.js');
const { adminHtml } = require('../lib/admin-html.js');
const keystore = require('../lib/keystore.js');

const requireFromHere = createRequire(__filename);

let _app = null;
function getApp() { if (_app) return _app; try { _app = requireFromHere('electron').app; } catch (e) { _app = null; } return _app; }

function configFile() {
  const home = process.env.CUCKOO_HOME || path.join(os.homedir(), '.cuckoo');
  return path.join(home, 'plugins-config.json');
}
/** 取本机局域网 IPv4 地址（排除回环/虚拟网卡常见段） */
function getLanIPs() {
  const out = [];
  try {
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
      if (/vEthernet|VMware|VirtualBox|Loopback|Hyper-V|WSL|Docker/i.test(name)) continue;
      for (const info of ifaces[name] || []) {
        if (info.family !== 'IPv4' || info.internal) continue;
        if (info.address.startsWith('169.254.')) continue;
        out.push({ iface: name, ip: info.address });
      }
    }
  } catch (e) { /* ignore */ }
  return out;
}

function readConfig() {
  const out = { port: 18900, host: '127.0.0.1', adminPassword: '', requireKey: true, autoStart: true, enabled: true, nativeMode: false };
  try {
    const file = configFile();
    if (fs.existsSync(file)) {
      const table = JSON.parse(fs.readFileSync(file, 'utf-8'));
      const c = table['ai-gateway'] || {};
      if (c.port) out.port = Number(c.port) || out.port;
      if (typeof c.host === 'string' && c.host) out.host = c.host;
      if (typeof c.adminPassword === 'string' && c.adminPassword) out.adminPassword = c.adminPassword;
      if (c.requireKey === false) out.requireKey = false;
      if (c.autoStart === false) out.autoStart = false;
      if (c.enabled === false) out.enabled = false;
      if (c.prankMode === true) out.prankMode = true;
      if (c.nativeMode === true) out.nativeMode = true;
    }
  } catch (e) {}
  return out;
}

/** 写回配置（合并已有字段） */
function writeConfig(patch) {
  try {
    const file = configFile();
    let table = {};
    try { if (fs.existsSync(file)) table = JSON.parse(fs.readFileSync(file, 'utf-8')); } catch (e) { table = {}; }
    table['ai-gateway'] = Object.assign({}, table['ai-gateway'] || {}, patch || {});
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(table, null, 2), 'utf-8');
    return true;
  } catch (e) { return false; }
}

// ===== 运行时状态 =====
let server = null;
let listenPort = 0;
let cfg = readConfig();
// 用户配置的端口（固定值；避免端口避让后 cfg.port 漂移）
let listenBasePort = cfg.port;
// 网关开关：false = 真正停掉 HTTP 服务（释放端口），不是软关闭
let gatewayEnabled = cfg.enabled !== false;
let toggling = false;
// 整活模式：开启后所有请求只回一句整活话（不再真跑 AI）
let prankMode = cfg.prankMode === true;
const PRANK_REPLY = '哈吉米哦南北绿豆，恭喜你被骗了，请自己去看瑞克摇';
const startedAt = Date.now();
let totalCalls = 0;
let logs = [];

function addLog(entry) { logs.unshift(Object.assign({ at: Date.now() }, entry)); if (logs.length > 200) logs.length = 200; }

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': (res.req && res.req.headers && res.req.headers.origin) || 'http://127.0.0.1' });
  res.end(JSON.stringify(obj));
}
function html(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(body);
}
function readBody(req) {
  return new Promise(function (resolve) {
    let b = '';
    req.on('data', function (c) { b += c; if (b.length > 8e6) req.destroy(); });
    req.on('end', function () { resolve(b); });
  });
}

// ===== 认证 =====
function getClientKey(req) {
  const auth = req.headers['authorization'] || '';
  const m = String(auth).match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}
function authClient(req) {
  if (!cfg.requireKey) return { ok: true, key: null };
  const k = getClientKey(req);
  const obj = keystore.validateKey(k);
  return obj ? { ok: true, key: k } : { ok: false };
}
const adminTokens = new Set();
function authAdmin(req) { return adminTokens.has(req.headers['x-admin-token'] || ''); }

// ===== OpenAI 聊天补全 =====
/**
 * 剥离工具代码块（```cuckoo / ```js）——客户端不该看到工具调用文本。
 * 含"未闭合"分支：流式过程中代码块还没写完时也要隐藏。
 */
function stripToolBlocks(text) {
  if (!text) return '';
  let out = String(text);
  out = out.replace(/```(?:cuckoo|javascript|js)\s*\n[\s\S]*?```/gi, '');
  out = out.replace(/```(?:cuckoo|javascript|js)\s*\n[\s\S]*$/gi, '');
  out = out.replace(/```(?:cuckoo|javascript|js)\s*$/gi, '');
  return out.trim();
}

/** 取网关查询入口（主进程由 entry.ts 挂到 globalThis） */
function getGatewayRun() {
  try { const fn = globalThis.__cuckooRunGatewayQuery; return (typeof fn === 'function') ? fn : null; } catch (e) { return null; }
}

async function handleChat(req, res, bodyText) {
  let isAborted = false;
  const timeoutTimer = setTimeout(function () {
    if (!res.headersSent) {
      isAborted = true;
      json(res, 504, { error: { message: 'Cuckoo 处理超时（可能是窗口未打开或 AI 未回复）' } });
    }
  }, 60000);
  res.on('close', function () { clearTimeout(timeoutTimer); });
  try {
      if (!gatewayEnabled) return json(res, 503, { error: { message: '网关已关闭（可在侧边栏面板或管理网站重新开启）', type: 'service_unavailable' } });
      const a = authClient(req);
      if (!a.ok) return json(res, 401, { error: { message: 'Invalid API key', type: 'invalid_request_error' } });
      let body = {};
      try { body = JSON.parse(bodyText || '{}'); } catch (e) { return json(res, 400, { error: { message: 'Invalid JSON' } }); }
      const messages = body.messages || [];
      const model = body.model || 'cuckoo-default';
      const tools = body.tools || null;
      const hasTools = Array.isArray(tools) && tools.length > 0;
      const stream = body.stream === true;
      const text = messagesToText(messages);
      if (hasTools) {
        const tPrompt = toolsToPrompt(tools);
        if (tPrompt) text += "\n\n" + tPrompt;
      }
      if (!text) return json(res, 400, { error: { message: 'messages 为空' } });
    
      // ===== 整活模式：不管问啥，只回一句整活话 =====
      if (prankMode) {
        totalCalls++;
        if (a.key) keystore.recordUse(a.key);
        const pid = 'chatcmpl-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
        addLog({ type: 'chat', model, stream, ok: true, prank: true, replyLen: PRANK_REPLY.length });
        if (stream) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': (res.req && res.req.headers && res.req.headers.origin) || 'http://127.0.0.1',
          });
          res.write(sseLine(streamChunk(pid, model, { role: 'assistant', content: '' }, null)));
          res.write(sseLine(streamChunk(pid, model, { content: PRANK_REPLY }, null)));
          res.write(sseLine(streamChunk(pid, model, {}, 'stop')));
          res.write('data: [DONE]\n\n');
          clearTimeout(timeoutTimer); res.end();
          return;
        }
        return json(res, 200, chatCompletion(pid, model, PRANK_REPLY));
      }
    
      const run = getGatewayRun();
      if (!run) return json(res, 503, { error: { message: '网关查询入口不可用（请重启 Cuckoo 开发版以加载）' } });
      const parentWindowId = getParentWindowId();
      if (!parentWindowId) return json(res, 503, { error: { message: '没有可用的 Cuckoo 窗口，请先打开一个窗口' } });
    
      totalCalls++;
      if (a.key) keystore.recordUse(a.key);
      const id = 'chatcmpl-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    
      // 流式：思考 → reasoning_content，正文 → content（像真 API）
      if (stream) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': (res.req && res.req.headers && res.req.headers.origin) || 'http://127.0.0.1',
        });
        res.write(sseLine(streamChunk(id, model, { role: 'assistant', content: '' }, null)));
        // 多轮（工具循环）流式：每轮文本会重置，需按轮追踪已发送内容
        let lastRawLen = 0, lastRawThinkLen = 0;
        let turnTextSent = '', turnThinkSent = '';
        let wroteAny = false;
        const r = await run({
          text: text,
          parentWindowId: parentWindowId,
          noCuckooPrompt: cfg.nativeMode === true,
          interceptTools: hasTools,
          onChunk: function (c) {
            try {
              const raw = (c && c.text) || '';
              const rawThink = (c && c.think) || '';
              if (raw.length < lastRawLen || rawThink.length < lastRawThinkLen) {
                turnTextSent = ''; turnThinkSent = '';
              }
              lastRawLen = raw.length;
              lastRawThinkLen = rawThink.length;
              if (rawThink.length > turnThinkSent.length) {
                const delta = rawThink.slice(turnThinkSent.length);
                turnThinkSent = rawThink;
                res.write(sseLine(streamChunk(id, model, { reasoning_content: delta }, null)));
                wroteAny = true;
              }
              const clean = stripToolBlocks(raw);
              if (clean.length > turnTextSent.length) {
                const delta = clean.slice(turnTextSent.length);
                turnTextSent = clean;
                res.write(sseLine(streamChunk(id, model, { content: delta }, null)));
                wroteAny = true;
              }
            } catch (_) { /* ignore */ }
          },
        });
        if (!r.ok) {
          addLog({ type: 'chat', model, stream, ok: false, error: r.error });
          res.write(sseLine({ error: { message: r.error || '未知错误' } }));
          res.write('data: [DONE]\n\n');
          clearTimeout(timeoutTimer); res.end();
          return;
        }
        if (hasTools) {
          const calls = parseToolCalls(r.text || '');
          if (calls && calls.length > 0) {
            calls.forEach(function(c, i) {
              const chunk = {
                tool_calls: [
                  { index: i, id: c.id, type: c.type, function: { name: c.function.name, arguments: c.function.arguments } }
                ]
              };
              res.write(sseLine(streamChunk(id, model, chunk, null)));
            });
            res.write(sseLine(streamChunk(id, model, {}, 'tool_calls')));
            addLog({ type: 'chat', model, stream: true, ok: true, replyLen: (r.text || '').length, tools: calls.length });
          } else {
            const clean = stripToolBlocks(r.text || '');
            if (clean) res.write(sseLine(streamChunk(id, model, { content: clean }, null)));
            res.write(sseLine(streamChunk(id, model, {}, 'stop')));
          }
        } else {
          if (!wroteAny && r.text) {
            const clean = stripToolBlocks(r.text);
            if (clean) res.write(sseLine(streamChunk(id, model, { content: clean }, null)));
          }
          res.write(sseLine(streamChunk(id, model, {}, 'stop')));
        }
        res.write('data: [DONE]\n\n');
        clearTimeout(timeoutTimer); res.end();
        return;
      }
    
      // 非流式
      const r = await run({ text: text, parentWindowId: parentWindowId, noCuckooPrompt: cfg.nativeMode === true });
      if (!r.ok) {
        addLog({ type: 'chat', model, stream, ok: false, error: r.error });
        return json(res, 500, { error: { message: r.error || '未知错误' } });
      }
      // B 模式（平台原生）：不剥离代码块，原样返回
      if (hasTools) {
        const calls = parseToolCalls(r.text || '');
        if (calls && calls.length > 0) {
          addLog({ type: 'chat', model, stream: false, ok: true, replyLen: (r.text || '').length, tools: calls.length });
          clearTimeout(timeoutTimer); return json(res, 200, chatCompletionWithCalls(id, model, r.text || '', calls));
        }
      }
      const clean = cfg.nativeMode === true ? (r.text || '') : stripToolBlocks(r.text || '');
      addLog({ type: 'chat', model, stream, ok: true, replyLen: clean.length });
      clearTimeout(timeoutTimer); return json(res, 200, chatCompletion(id, model, clean));
  } catch (e) {
    console.error("[ai-gateway] handleChat 崩溃:", e);
    try { if (!res.headersSent) json(res, 500, { error: { message: e.message } }); else clearTimeout(timeoutTimer); res.end(); } catch (_) {}
  }
}

// ===== 路由 =====
async function handle(req, res) {
  res.setHeader('Access-Control-Allow-Origin', (req.headers.origin || 'http://127.0.0.1'));
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  if (req.method === 'OPTIONS') { res.writeHead(204); clearTimeout(timeoutTimer); res.end(); return; }

  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const p = url.pathname;

  // ---- OpenAI 兼容 ----
  if (p === '/v1/models' && req.method === 'GET') {
    return json(res, 200, { object: 'list', data: [{ id: 'cuckoo-default', object: 'model', created: Math.floor(startedAt / 1000), owned_by: 'cuckoo' }] });
  }
  if ((p === '/v1/chat/completions' || p === '/chat/completions') && req.method === 'POST') {
    const body = await readBody(req);
    return handleChat(req, res, body);
  }
  if (p === '/v1' || p === '/v1/') return json(res, 200, { object: 'list', data: [] });

  // ---- 管理网站 ----
  if (p === '/' || p === '/admin') return html(res, 200, adminHtml());

  // ---- 管理 API ----
  if (p === '/api/login' && req.method === 'POST') {
    const body = await readBody(req); let b = {};
    try { b = JSON.parse(body || '{}'); } catch (e) {}
    if (b.password !== cfg.adminPassword) return json(res, 401, { success: false, error: '密码错误' });
    const t = crypto.randomBytes(16).toString('hex');
    adminTokens.add(t);
    return json(res, 200, { success: true, token: t });
  }
  if (p === '/api/stats' && req.method === 'GET') {
    return json(res, 200, {
      running: !!server, enabled: gatewayEnabled, port: listenPort, host: cfg.host, requireKey: cfg.requireKey,
      totalCalls: totalCalls, startedAt: startedAt,
      hasAIPage: !!getAIWebContents(), projectDir: getProjectDir(),
      lanIPs: getLanIPs(), keyCount: keystore.loadKeys().length,
    });
  }
  if (p === '/api/toggle' && req.method === 'POST') {
    if (!authAdmin(req)) return json(res, 401, { success: false, error: '未登录' });
    const body = await readBody(req); let b = {};
    try { b = JSON.parse(body || '{}'); } catch (e) {}
    const want = b.enabled !== false;
    writeConfig({ enabled: want });
    console.log('[ai-gateway] 网关开关 -> ' + (want ? '开' : '关'));
    // 先回复，再启停（关闭时不能先 stop，否则这个响应发不出去）
    json(res, 200, { success: true, enabled: want });
    setTimeout(function () { applyEnabled(want); }, 120);
    return;
  }
  // 以下需登录
  if (p.startsWith('/api/')) {
    if (!authAdmin(req)) return json(res, 401, { success: false, error: '未登录' });

    if (p === '/api/keys' && req.method === 'GET') {
      const list = keystore.loadKeys().map(function (k) {
        const plain = (typeof k.__plain === 'string' && k.__plain) || k.key;
        return { key: plain, note: k.note, createdAt: k.createdAt, enabled: k.enabled, calls: k.calls, lastUsedAt: k.lastUsedAt };
      });
      return json(res, 200, { success: true, keys: list });
    }
    if (p === '/api/keys' && req.method === 'POST') {
      const body = await readBody(req); let b = {};
      try { b = JSON.parse(body || '{}'); } catch (e) {}
      const k = keystore.createKey(b.note || '');
      return json(res, 200, { success: true, key: k });
    }
    if (p.startsWith('/api/keys/') && p.endsWith('/toggle') && req.method === 'POST') {
      const key = decodeURIComponent(p.slice('/api/keys/'.length, -'/toggle'.length));
      const body = await readBody(req); let b = {};
      try { b = JSON.parse(body || '{}'); } catch (e) {}
      const ok = keystore.setKeyEnabled(key, b.enabled !== false);
      return json(res, 200, { success: ok });
    }
    if (p.startsWith('/api/keys/') && req.method === 'DELETE') {
      const key = decodeURIComponent(p.slice('/api/keys/'.length));
      return json(res, 200, { success: keystore.deleteKey(key) });
    }
    if (p === '/api/logs' && req.method === 'GET') return json(res, 200, { success: true, logs: logs.slice(0, 50) });
    return json(res, 404, { success: false, error: 'unknown api' });
  }

  res.writeHead(404); res.end('Not Found');
}

function start() {
  return new Promise(function (resolve, reject) {
    if (server) return resolve(listenPort);
    var basePort = listenBasePort;
    var tries = 0;
    function attempt() {
      var tryPort = basePort + tries;
      var srv = http.createServer(function (req, res) { handle(req, res).catch(function () { try { res.writeHead(500); res.end('error'); } catch (e) {} }); });
      srv.once('error', function (err) {
        if (err && err.code === 'EADDRINUSE' && tries < 20) { tries++; attempt(); return; }
        reject(err);
      });
      srv.listen(tryPort, cfg.host, function () {
        server = srv;
        listenPort = srv.address().port;
        console.log('[ai-gateway] 网关已启动: http://' + cfg.host + ':' + listenPort);
        resolve(listenPort);
      });
    }
    attempt();
  });
}

/** 真正停掉 HTTP 服务（释放端口 + 断开所有连接） */
function stop() {
  return new Promise(function (resolve) {
    var srv = server;
    server = null;
    listenPort = 0;
    if (!srv) return resolve();
    try {
      // 断开 keep-alive 连接（否则端口会挂住）
      if (typeof srv.closeAllConnections === 'function') srv.closeAllConnections();
      srv.close(function () { console.log('[ai-gateway] 网关已停止（端口已释放）'); resolve(); });
    } catch (e) { resolve(); }
  });
}

/** 统一启停（幂等 + 防并发） */
async function applyEnabled(want) {
  if (toggling) return;
  if (want === gatewayEnabled && (want ? !!server : !server)) return;
  toggling = true;
  try {
    gatewayEnabled = want;
    if (want) { try { await start(); } catch (e) { console.log('[ai-gateway] 启动失败: ' + (e && e.message)); } }
    else { await stop(); }
  } finally { toggling = false; }
}

// ===== Provider 接口（原版市场格式必需字段）=====
const provider = {
  id: 'ai-gateway',
  name: 'AI 网关',
  homeUrl: 'http://127.0.0.1:18900',
  sessionUrlBase: 'http://127.0.0.1:18900/',
  extractSessionId: function () { return null; },
  matchesUrl: function () { return false; },  // 不是 AI 平台，不劫持平台识别
};

// ===== 自动启动（仅主进程）=====
// provider 文件在「主进程」与「渲染进程」都会被 require：主进程用于提供 HTTP 服务，
// 渲染进程只用于 URL 匹配（matchesUrl）。服务只能在主进程起，否则会出现两个实例。
if (process.type === 'renderer') {
  console.log('[ai-gateway] 渲染进程：跳过启动（服务由主进程提供）');
} else {
  (async function bootstrap() {
    try {
      if (cfg.autoStart && gatewayEnabled) {
        await start();
        console.log('[ai-gateway] 工具就绪，管理网站: http://' + cfg.host + ':' + listenPort);
      } else {
        console.log('[ai-gateway] 未自动启动（autoStart=' + cfg.autoStart + ' enabled=' + gatewayEnabled + '）');
      }
      // 轮询配置：侧边栏/管理网站改 enabled → 真正启停服务（不依赖 HTTP）
      setInterval(function () {
        try {
          const c = readConfig();
          if (c.enabled !== gatewayEnabled) {
            console.log('[ai-gateway] 配置轮询：网关 -> ' + (c.enabled ? '开' : '关'));
            applyEnabled(c.enabled);
          }
          if ((c.prankMode === true) !== prankMode) {
            prankMode = c.prankMode === true;
            console.log('[ai-gateway] 配置轮询：整活模式 -> ' + (prankMode ? '开' : '关'));
          }
        } catch (e) { /* ignore */ }
      }, 2500);
    } catch (err) {
      console.log('[ai-gateway] 启动失败: ' + (err && err.message ? err.message : err));
    }
  })();
}

// ===== 向壳页面暴露运行时状态（走 IPC，避开 file:// fetch 127.0.0.1 被拦）=====
try {
  const table = (globalThis.__cuckooPluginHostFns = globalThis.__cuckooPluginHostFns || {});
  table['ai-gateway:stats'] = function () {
    return {
      running: !!server,
      enabled: gatewayEnabled,
      port: listenPort || listenBasePort,
      host: cfg.host,
      requireKey: cfg.requireKey,
      totalCalls: totalCalls,
      startedAt: startedAt,
      hasAIPage: !!getAIWebContents(),
      projectDir: getProjectDir(),
      lanIPs: getLanIPs(),
      keyCount: keystore.loadKeys().length,
      prankMode: prankMode,
    nativeMode: cfg.nativeMode === true,
    };
  };
  table['ai-gateway:prank'] = function (args) {
    const want = !args || args.enabled !== false;
    prankMode = want;
    writeConfig({ prankMode: want });
    console.log('[ai-gateway] 整活模式 -> ' + (want ? '开' : '关'));
    return { prankMode: prankMode };
  };
  table['ai-gateway:native'] = function (args) {
    const want = !args || args.enabled !== false;
    writeConfig({ nativeMode: want });
    cfg = readConfig();
    console.log('[ai-gateway] B 模式（平台原生）-> ' + (want ? '开' : '关'));
    return { nativeMode: want };
  };
  table['ai-gateway:toggle'] = async function (args) {
    const want = !args || args.enabled !== false;
    writeConfig({ enabled: want });
    await applyEnabled(want);
    return { enabled: gatewayEnabled };
  };
} catch (e) { /* ignore */ }

module.exports = provider;
module.exports.__gateway = {
  start: function () { return start(); },
  stop: function () { return stop(); },
  status: function () { return { running: !!server, port: listenPort, host: cfg.host, totalCalls: totalCalls }; },
};
