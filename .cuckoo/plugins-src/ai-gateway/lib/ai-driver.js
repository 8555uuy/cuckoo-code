/**
 * AI 驱动：把消息送进 Cuckoo 的 AI 页面，捕获完整回复。
 */
const path = require('node:path');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const { buildInjectCode } = require('./ai-inject.js');

const requireFromHere = createRequire(__filename);
let _app = null;
function getApp() { if (_app) return _app; try { _app = requireFromHere('electron').app; } catch (e) { _app = null; } return _app; }

function resolveAppPath(rel) {
  const roots = [];
  const app = getApp();
  try { if (app) roots.push(app.getAppPath()); } catch (e) {}
  try { roots.push(process.cwd()); } catch (e) {}
  try { if (process.resourcesPath) roots.push(path.join(process.resourcesPath, 'app.asar')); } catch (e) {}
  for (const root of roots) { const c = path.join(root, rel); if (fs.existsSync(c)) return c; }
  return null;
}

function getAIWebContents() {
  try {
    const file = resolveAppPath('out/src/app/window.js') || resolveAppPath('src/app/window.js');
    if (!file) return null;
    const windowState = requireFromHere(file);
    const ctxs = windowState.getAllContexts();
    for (let i = ctxs.length - 1; i >= 0; i--) {
      const c = ctxs[i];
      if (c && c.isSubagent) continue;
      const v = c && c.view;
      if (v && v.webContents && !v.webContents.isDestroyed()) return v.webContents;
    }
    return null;
  } catch (e) { return null; }
}

/** 取一个非子代理窗口的 windowId（网关查询的"父窗口"） */
function getParentWindowId() {
  try {
    const file = resolveAppPath('out/src/app/window.js') || resolveAppPath('src/app/window.js');
    if (!file) return null;
    const windowState = requireFromHere(file);
    const ctxs = windowState.getAllContexts();
    for (let i = ctxs.length - 1; i >= 0; i--) {
      const c = ctxs[i];
      if (c && c.isSubagent) continue;
      if (c && c.win && !c.win.isDestroyed()) return c.win.id;
    }
    return null;
  } catch (e) { return null; }
}

function getProjectDir() {
  try {
    const file = resolveAppPath('out/src/app/window.js') || resolveAppPath('src/app/window.js');
    if (!file) return null;
    const windowState = requireFromHere(file);
    const ctxs = windowState.getAllContexts();
    for (let i = ctxs.length - 1; i >= 0; i--) {
      const c = ctxs[i];
      if (c && c.isSubagent) continue;
      const store = c && c.sessionStore;
      const dir = store && store.state && store.state.selectedProjectDir;
      if (dir) return dir;
    }
    return null;
  } catch (e) { return null; }
}

// 捕获脚本：等"最终回复"（跳过工具调用轮）。
// Cuckoo 每轮回复都会派发 cuckoo-ai-response(finished)；含 cuckoo/js 代码块的是工具调用轮，
// 这类轮次后 Cuckoo 会执行工具并把结果回传，AI 继续下一轮——必须等到不含工具块的回复才算最终答案。
var CAPTURE_CODE = [
  '(function () {',
  '  return new Promise(function (resolve) {',
  '    var acc = "";',
  '    var lastText = "";',
  '    var done = false;',
  '    var BT = String.fromCharCode(96) + String.fromCharCode(96) + String.fromCharCode(96);',
  '    function hasToolBlock(t) {',
  '      t = t || "";',
  '      return t.indexOf(BT + "cuckoo") >= 0 || t.indexOf(BT + "js") >= 0;',
  '    }',
  '    function finish(text, reason) {',
  '      if (done) return; done = true;',
  '      window.removeEventListener("cuckoo-ai-stream", onStream);',
  '      window.removeEventListener("cuckoo-ai-response", onResp);',
  '      resolve({ text: text, reason: reason });',
  '    }',
  '    function onStream(ev) {',
  '      var d = (ev && ev.detail) || {};',
  '      if (typeof d.text === "string" && d.text.length >= acc.length) acc = d.text;',
  '    }',
  '    function onResp(ev) {',
  '      var d = (ev && ev.detail) || {};',
  '      if (!d.finished) return;',
  '      var t = d.text || acc || "";',
  '      lastText = t;',
  '      if (hasToolBlock(t)) { acc = ""; return; }',
  '      finish(t, "finished");',
  '    }',
  '    window.addEventListener("cuckoo-ai-stream", onStream);',
  '    window.addEventListener("cuckoo-ai-response", onResp);',
  '    var t0 = Date.now();',
  '    var iv = setInterval(function () { if (Date.now() - t0 > 180000) { clearInterval(iv); finish(lastText || acc, "timeout"); } }, 1000);',
  '  });',
  '})();',
].join('\n');

async function ask(text, timeoutMs) {
  const wc = getAIWebContents();
  if (!wc) return { ok: false, error: '未找到 AI 页面（请先打开一个 AI 窗口）' };
  const to = timeoutMs || 180000;
  const capturePromise = wc.executeJavaScript(CAPTURE_CODE, true).catch(function (e) {
    return { text: '', reason: 'capture_error:' + (e && e.message) };
  });
  const injectCode = buildInjectCode(text);
  let sendRes;
  try { sendRes = await wc.executeJavaScript(injectCode, true); }
  catch (e) { return { ok: false, error: '注入失败: ' + (e && e.message) }; }
  if (sendRes === 'NO_INPUT') return { ok: false, error: '未找到输入框' };
  if (sendRes !== 'SENT') return { ok: false, error: '发送失败: ' + sendRes };
  const result = await Promise.race([
    capturePromise,
    new Promise(function (r) { setTimeout(function () { r({ text: '', reason: 'overall_timeout' }); }, to); }),
  ]);
  if (result && (result.reason === 'timeout' || result.reason === 'overall_timeout')) return { ok: false, error: '等待回复超时' };
  return { ok: true, text: (result && result.text) || '' };
}

module.exports = { ask, getAIWebContents, getProjectDir, resolveAppPath, getParentWindowId };
