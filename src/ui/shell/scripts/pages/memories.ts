/**
 * 记忆（Memories）页：列表、搜索、新建、编辑（原地）、删除。
 * 编辑优先走 updateMemory（服务端原地更新，保留 id/createdAt）；
 * 旧 preload 无 updateMemory 时降级为 saveMemories 整体覆盖。
 */
import { api, ckAlert, ckConfirm, ckPrompt, escapeHtml, escapeAttr } from "../shared.js";

let memories: any[] = [];
let keyword = "";

function fmtTime(ts: number): string {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    const pad = (n: number) => (n < 10 ? "0" + n : String(n));
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  } catch (_) { return ""; }
}

async function loadEnabledState(): Promise<void> {
  const cb = document.getElementById("mem-enabled") as any;
  if (!cb || !api.getMemoriesEnabled) return;
  try {
    const r = await api.getMemoriesEnabled();
    cb.checked = !!(r && r.success && r.enabled);
  } catch (_) { cb.checked = false; }
}

export async function loadMemories(): Promise<void> {
  await loadEnabledState();
  if (!api.listMemories) return;
  try {
    const res = await api.listMemories();
    memories = (res && res.success && Array.isArray(res.memories)) ? res.memories : [];
  } catch (_) { memories = []; }
  renderMemories();
}

function filtered(): any[] {
  const k = keyword.trim().toLowerCase();
  if (!k) return memories;
  return memories.filter((m: any) => String(m.text || "").toLowerCase().indexOf(k) >= 0);
}

function renderMemories(): void {
  const listEl = document.getElementById("mem-list");
  if (!listEl) return;
  const list = filtered();
  if (!list.length) {
    const msg = keyword ? "没有匹配的记忆" : "还没有记忆，点上方新建，或让 AI 用 remember 工具";
    listEl.innerHTML = "<div class=ck-list-empty>" + msg + "</div>";
    return;
  }
  listEl.innerHTML = list.map((m: any) => {
    const t = fmtTime(m.updatedAt || m.createdAt);
    const timeLine = t ? "<div style=font-size:11px;opacity:.55>更新于 " + escapeHtml(t) + "</div>" : "";
    return "<div class=ck-snip-item data-id=" + escapeAttr(m.id) + ">"
      + "<div class=ck-snip-top>"
      + "<span class=ck-snip-name style=white-space:pre-wrap;word-break:break-word>" + escapeHtml(m.text) + "</span>"
      + "<div class=ck-snip-actions>"
      + "<button class=ck-snip-icon-btn data-edit=" + escapeAttr(m.id) + " title=编辑>&#9998;</button>"
      + "<button class=ck-snip-icon-btn danger data-del=" + escapeAttr(m.id) + " title=删除>&#128465;</button>"
      + "</div></div>"
      + timeLine
      + "</div>";
  }).join("");

  listEl.querySelectorAll("[data-edit]").forEach((btn: any) => {
    btn.addEventListener("click", async (e: any) => {
      e.stopPropagation();
      const m = memories.filter((x: any) => x.id === btn.dataset.edit)[0];
      if (!m) return;
      const text = await ckPrompt({ title: "编辑记忆", value: m.text });
      if (text === null) return;
      const t = text.trim();
      if (!t) { await ckAlert("内容不能为空"); return; }
      if (api.updateMemory) {
        try { await api.updateMemory(m.id, t); } catch (_) {}
      } else if (api.saveMemories) {
        memories = memories.map((x: any) => x.id === m.id ? { ...x, text: t, updatedAt: Date.now() } : x);
        try { await api.saveMemories(memories); } catch (_) {}
      }
      await loadMemories();
    });
  });
  listEl.querySelectorAll("[data-del]").forEach((btn: any) => {
    btn.addEventListener("click", async (e: any) => {
      e.stopPropagation();
      const id = btn.dataset.del;
      const m = memories.filter((x: any) => x.id === id)[0];
      const label = m ? m.text : "";
      const ok = await ckConfirm("确定删除记忆「" + label + "」？");
      if (!ok) return;
      if (api.deleteMemory) { try { await api.deleteMemory(id); } catch (_) {} }
      await loadMemories();
    });
  });
}

document.getElementById("mem-add")?.addEventListener("click", async () => {
  const text = await ckPrompt({ title: "新建记忆", placeholder: "如：用户偏好用中文回复" });
  if (text === null) return;
  const t = text.trim();
  if (!t) { await ckAlert("内容不能为空"); return; }
  if (api.addMemory) { try { await api.addMemory(t); } catch (_) {} }
  await loadMemories();
});
document.getElementById("mem-refresh")?.addEventListener("click", loadMemories);
document.getElementById("mem-search")?.addEventListener("input", (e: any) => {
  keyword = String(e.target.value || "");
  renderMemories();
});

document.getElementById("mem-enabled")?.addEventListener("change", async (e: any) => {
  if (!api.setMemoriesEnabled) return;
  try {
    await api.setMemoriesEnabled(!!e.target.checked);
    await ckAlert(e.target.checked ? "记忆功能已开启" : "记忆功能已关闭");
  } catch (_) { await ckAlert("设置失败"); }
});

if (api.onMemoriesChanged) {
  api.onMemoriesChanged(() => { loadMemories(); });
}
