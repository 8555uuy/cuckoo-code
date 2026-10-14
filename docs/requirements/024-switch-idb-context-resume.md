---
id: 024
type: fix
title: 窗口组转移复用 IDB 重写 + 上下文耗尽续接补发工具结果
status: done
branch: fix/024-switch-idb-context-resume
created: 2026-10-14
updated: 2026-10-14
---

## 背景

两个相关问题：

1. **窗口组转移对话拿不到 IDB**
   - 转移对话（`runSwitchForGroup`）直接调 `shareAllForSwitch()` 读 IndexedDB。
   - 但 DeepSeek 的 IDB **同会话内不更新**（AI 回复后不写），只有**刷新页面**才补齐 ——
     导致转移拿到的是旧/不全的消息（分享内容缺失）。
   - 压缩流程（`compaction.ts`）之所以能拿到全量，是因为它走了「**清 IDB → 刷新 → 等重写 → 再读**」。

2. **上下文耗尽续接丢掉未发出的工具结果**
   - 实测：工具执行完 → 结果**填入输入框**、进入**发送延迟**（300ms~5s）；
     同一时刻 ChatGPT hook 检测到 `banner_info`（`context-truncation-block`）→ 触发续接 → 导航首页。
   - 那条结果**卡在延迟里随页面导航丢失**，续接只做 `initProject`（发系统提示词），
     没把它带到新会话 → 新会话不知道工具结果，可能重复执行或答非所问。

## 目标

- 窗口组转移对话时，源窗口**复用压缩的 IDB 重写逻辑**（清 IDB + 刷新 + 等重写），拿到**全量消息**再分享。
- 上下文耗尽续接时，**捞回**中断前「已填入、未及发送」的工具结果，作为额外提示词补发到新会话。

## 方案

### 一、窗口组转移复用 IDB 重写（`fix/024` 主体）

**复用压缩的三段式**（因刷新会打断在途 IPC，改用 `switchId` 跨刷新关联 + 事件化交接）：

- **段A** `prepareSwitchShare(switchId)`（源窗口，`session/compaction.ts`）：
  存 `switchId` → 清当前会话 IDB → URL 加 `?cuckoo-switch=1` → 刷新。
- **段B** `checkPendingSwitch()`（刷新后，`session/compaction.ts`）：
  清 URL 标记 → 等 hook 的 IDB 写入事件 → 读全量 IDB → `pickRecentPairedIds(ratio=1.0)`
  → `createShare` → 通过 `electronAPI.switchShareReady` 上报主进程（**不跳转**，由主进程导航目标窗口）。
- **hook**（`providers/hooks/deepseek.ts`）：IDB 写入监听从「仅 `cuckoo-compact`」扩展为
  「`cuckoo-compact` **或** `cuckoo-switch`」。
- **主进程**（`app/ipc/window-groups.ts`）：`requestShareFromWindow` → `requestSwitchShare`
  （发 `cuckoo-switch-prepare`，等 `cuckoo-switch-share-result` 回执；超时 90s）。
- **接入**：`bridge/entry.ts`（处理 `cuckoo-switch-prepare`）、`overlay/events.ts`（init 调 `checkPendingSwitch`）、
  `bridge/api.ts`（`switchShareReady`）、`app/entry.ts`（`runSwitchForGroup` 改用 `requestSwitchShare`）。

**与压缩的差异**：ratio=1.0（全量分享，非最近 20%）；不跳转（分享链接由主进程交给目标窗口）。

### 二、上下文耗尽续接补发工具结果

- **`overlay/chat-input.ts`**：
  - `PendingSend` 增加 `text`/`tag` 字段（记录待发内容）；新增 `takePendingSendText()`（取出待发文本）。
  - 新增 `lastToolResultText` 记录 + `getLastToolResultText()`：每次 `sendCombinedJsResultsToChat` 记录最近工具结果。
- **`bridge/intercept/observer.ts`**：`cuckoo-context-exhausted` 监听里**两级捞取**：
  1. 优先 `cancelPendingSend()` + `takePendingSendText()`——捞「刚填入、未及发送」的（结果卡在发送延迟里）；
  2. 否则 `getLastToolResultText()`——用「**最近已发出的工具结果**」。
     （⚠️ 实测：耗尽通常在 **AI 回复流末尾**触发，此时工具结果**早已发出**，
     `pendingSend` 已清空——只用方案 1 会捞到 0。方案 2 是必需的兜底。）
- **`bridge/api.ts`**：`contextExhaustedContinue(payload)` 透传 `pendingText`。
- **`app/ipc/session.ts`**：`context-exhausted-continue` 接收 `pendingText`，
  构造续接说明作为 `initProject` 的 `extraPrompt`（拼在系统提示词末尾），一并发出。

**续接说明措辞**：
```
【续接说明】上一会话因上下文耗尽中断。中断前最后一个工具调用的执行结果如下，
请据此继续工作（不要重复执行同一工具；如需更多上下文，请用工具读取项目文件）：
<工具结果原文>
```

## 验收标准

- [x] 窗口组转移对话：源窗口清 IDB + 刷新 + 等重写，目标窗口拿到**完整对话**（**已真机验证**）
- [x] 上下文耗尽续接：新会话带上**中断前的工具结果**（**已真机验证**）
  - 日志：`用最近已发出的工具结果续接，长度=5407`、`待补发=5407 字符`、`initial-prompt 事件, content长度=30850`
- [x] typecheck / compile / test 全绿

真机验证方式：
- 转移对话：窗口管理页对组点「转移对话」，观察源窗口刷新、目标窗口加载完整对话。
- 耗尽续接：等 ChatGPT 会话上下文耗尽（`context-truncation-block`），观察新窗口是否带上工具结果
  （日志关键词：`用最近已发出的工具结果续接，长度=`、`待补发=N 字符`）。

## 遗留 / 后续

- 转移对话的 `checkPendingSwitch` 与压缩的 `checkPendingCompact` 共用
  `waitForIdbWrite` / `getMessagesFromIndexedDB` / `createShare`，后续如需可进一步抽象合并。
- 耗尽续接的 `getLastToolResultText` 只记「最近一次」工具结果；若连续多个工具结果未及被 AI 消费，仅最后一个被带过去（可接受，工具结果本就按轮次处理）。
