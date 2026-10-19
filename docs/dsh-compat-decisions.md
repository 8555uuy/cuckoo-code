# DSH 插件兼容 —— 关键决策记录

> 本文件固化 2026-10-19 讨论的全部决定，后续开发对照执行。
> 决策原则：**通用兼容**（不只适配 dsh-tasks）、**编译期保护**（Branded Type）、**不糊弄**。

---

## 一、核心架构：两套 Session ID

### 1.1 为什么必须两套

| ID | 来源 | 用途 |
|---|---|---|
| **`logicId`** | 插件生成（如 `dsh-tasks` 的 `session-xxx`）| 插件接口（`ctx.agents` / `agent` / `workspace`）|
| **`webId`** | 网页 AI 生成（URL 里的 `.../s/xxx`）| Cuckoo 内部（`sessionStore` / UI / `handleUrlChange`）|

**根因**：DSH 的 `agents.create` **要求调用方指定 `sessionId`**；Cuckoo 的网页 AI **只能事后从 URL 拿 `webId`**。

### 1.2 两套 ID 的治理（Branded Type）

```ts
type WebId = string & { readonly __brand: 'WebId' };
type LogicId = string & { readonly __brand: 'LogicId' };
```

- **所有 `sessionId: string` 参数改名**：内部用 `webId: WebId`，插件边界用 `logicId: LogicId`
- **翻译层唯一入口**：`src/session/logic-id-map.ts`
- **传错 ID 编译报错**（不是运行时静默 bug）

### 1.3 翻译层接口

```ts
webIdOf(logicId: LogicId): WebId | null
logicIdOf(webId: WebId): LogicId | null
bind(logicId: LogicId, webId: WebId): void
ensureLogicId(webId: WebId): LogicId   // 系统触发：logicId = webId
has(logicId: LogicId): boolean
```

**落盘**：`~/.cuckoo/logic-id-map.json`（全局一张表）

### 1.4 映射生命周期

- **系统触发**：URL 变化（`handleUrlChange`）时 `ensureLogicId(webId)` → `logicId = webId`
- **插件触发**：`create` 时记 pending，网页 id 出现后 `bind(logicId, webId)`
- **清理**：**不做**（Cuckoo 没有"删除会话"逻辑，映射不会变脏）
- **历史数据**：启动时扫描所有 `webId`，补 `logicId = webId`

---

## 二、`dsh-tasks` 兼容（核心）

### 2.1 `agents.create` 的语义

| 项 | 决定 |
|---|---|
| **sessionId** | 必填（插件给的 `logicId`）|
| **行为** | **只开对话**（导航到 AI 首页）+ **记目录**，**不发任何消息** |
| **返回时机** | 等页面 `did-finish-load`（若已在首页则立刻返回）|
| **窗口** | 用 `agentOptions.model` 指定的窗口（= `profile.id`）；没开则**后台打开**（不抢焦点）|
| **已存在 sessionId** | 保持 DSH 行为（报错）|

### 2.2 `agent.followup` 的语义

| 项 | 决定 |
|---|---|
| **首次**（该会话没发过系统提示词）| **合并发**：系统提示词 + 用户消息 |
| **后续** | 只发用户消息 |
| **"已发"判断** | 内存 `Set<webId>`（不落盘；重启后老会话多带一次，无害）|
| **并发** | 串行（一个窗口一次只跑一个对话；忙则排队）|
| **支持已存在会话** | 通过 `ctx.agents.get(sessionId)` 拿到 agent 后 `followup`（追加模式）|

### 2.3 `workspace.attachSession`

| 项 | 决定 |
|---|---|
| **入参** | `sessionId`（1 个，即 `logicId`）|
| **返回** | `Promise<void>` |
| **挂起** | 网页 id 还没出现 → 立刻返回（后台等 URL 变化再绑）|
| **校验** | **不做** DSH 的 `cwd == workspace.path` 校验（Cuckoo 没有独立 workspace 实体）|
| **实质** | 翻译 `logicId → webId`，然后 `saveSessionDirMapping(webId, dir)` |

### 2.4 `workspaceRegistry`

- `list()` / `get(id)` / `workspace.path` / `workspace.title` / `workspace.attachSession` —— **已有 4 个，补 `attachSession` 的翻译**
- **不新增** `detachSession` / `insertSessionBefore` / `status` / `workspaceRegistry.create`

### 2.5 通知

- **复用现有 `show-ai-notification`**（窗口聚焦则跳过；未聚焦则弹通知 + 任务栏闪烁）
- **不区分"定时任务"**（统一"AI任务已完成"）

### 2.6 窗口行为

- **后台开**（不抢焦点，`showInactive`）
- **跑完保留**（不自动关，用户自己关）
- **指定窗口没开** → 后台打开那个窗口

---

## 三、初始化流程改造

### 3.1 触发条件（初始化卡片/覆盖层输入框）

- **判断依据**：**当前会话是否绑定了项目目录**（`sessionId → meta.projectDir`）
- **无会话（新窗口）** → 显示
- **有会话但未绑** → 显示
- **已绑** → 不显示（改目录走"快捷提示词 → 重新项目初始化"）

### 3.2 两种模式的行为

| 模式 | 输入框 | 系统提示词 |
|---|---|---|
| **原版模式** | **覆盖层输入框**（盖住网页原生输入框）| **用户可见**（填进输入框，光标放最后）|
| **纯净模式** | Cuckoo 自己的输入框 | **隐藏**（占位提示"已附加系统提示词"，发送时合并）|

### 3.3 原版模式覆盖层细节

- **盖住**网页原生输入框（用户点到的都是我们的）
- **带"重新选择目录"**小按钮（选错了能重选）
- **等待期间（AI 回复中）**：禁用输入框 + 显示"AI 正在处理…" + **提供"停止"按钮**（转发 `stopGeneration`）
- **绑定成功后**：覆盖层**隐藏**，交还网页原生输入框

### 3.4 绑定时机

| 场景 | 绑定时机 |
|---|---|
| **新窗口（无 sessionId）** | **URL 变化时**（AI 回复后拿到 `webId`）|
| **老会话（有 sessionId、未绑目录）** | **选完目录立刻绑**（`saveSessionDirMapping`）|

---

## 四、实现顺序（排期）

| 批次 | 内容 | 耗时 |
|---|---|---|
| **第 1 批（类型地基）** | 翻译层 + 核心 5 文件 + 27 边缘文件 + tsc 全过 | **1 天** |
| **第 2 批（功能）** | `AgentSession` + `create`/`followup` + 覆盖层输入框 | **2-3 天** |
| **第 3 批（联调）** | `dsh-tasks` 跑通 + 修边角 | **1 天** |

**原则**：**类型先立，功能不回头改**；**不隔夜**接功能。

---

## 五、剩余未确认事项（待讨论）

| # | 事项 | 备注 |
|---|---|---|
| 1 | `ctx.agents.get(sessionId)` 的 Cuckoo 实现 | 返回什么？逻辑 id 还是需要翻译 |
| 2 | `followup` 支持"已存在会话"的完整流程 | 走 `get` + `followup`，还是别的 |
| 3 | 原版模式"填输入框"的 React/Vue 兼容技术 | `nativeInputValueSetter` + `input` 事件 |
| 4 | "AI 首次回复成功"的精确判断 | `harness-event` 的 `status: idle` 够不够 |
| 5 | `dsh-tasks` 的 `turn/end` 监听与映射清理的关系 | 当前决定不清理，待确认 |
| 6 | 排队超时策略 | 两个任务撞同一窗口，排队最长等多久 |

---

## 六、已完成的相关改动（本文件记录前）

- `storageDomain` / `agentDefaultModel` / `connection` 兼容层（`dsh-tasks` + `dshmarket` 跑通）
- `llm` 服务（provider = 平台，model = 窗口）
- `workspaceRegistry` 的 `list` / `get` / `title` / `attachSession`（基础版）
- `fetch` 拦截器动态路由（`plugin-web-routes` IPC）
- `main` 插槽页关闭按钮 + 顶部留白
- DSH 设计令牌（237 个 `--dsw-*`）+ 252 个图标

---

*最后更新：2026-10-19*
