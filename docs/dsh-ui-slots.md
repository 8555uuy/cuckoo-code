# DSH 界面插槽清单（实测）

> 来源：**2026-10-09 实测** DSH Web（`http://127.0.0.1:3080`），用 playwright 扫描 DOM 得到。
> 用途：**对照设计 Cuckoo 自己的 UI 扩展点**。逐个确认"要不要做、怎么做"。
> 状态：⬜ 待评估 / 🔨 进行中 / ✅ 已支持 / ❌ 不做

---

## 一、DSH 插槽机制（实测）

DSH 每个插槽在 DOM 里是**一个带名字的容器**：

```html
<div data-slot="sidebar.footer.action" style="display: contents;">
  <!-- 插件注册的组件渲染在这里 -->
</div>
```

**关键事实**：
- 插槽用 **`data-slot="<点分名>"`** 标记（如 `sidebar.brand.mark`）
- 插槽是 **DOM 挂载点**——**不绑 React**（React 只是 DSH 的渲染实现）
- 页面共扫描到 **40 个插槽**（含空槽与已占槽）
- **空槽**（`children.length === 0`）是"留给插件的插孔"

**对本项目的启示**：Cuckoo **可用原生 JS 实现同样的"命名挂载点"机制**，无需引入 React。

---

## 二、槽位清单（按区域）

### 2.1 全局

| # | 槽位 | 中文名 | 状态 | Cuckoo 评估 |
|---|---|---|---|---|
| 1 | `root` | 根容器 | 已占 | ⬜ |
| 2 | `shell.overlay` | 全局浮层 | **空** | ⬜ |

### 2.2 左侧栏

| # | 槽位 | 中文名 | 状态 | Cuckoo 评估 |
|---|---|---|---|---|
| 3 | `sidebar` | 侧边栏（整条）| 已占 | ⬜ |
| 4 | `sidebar.brand.mark` | 品牌图标 | 已占 | ⬜ |
| 5 | `sidebar.brand.name` | 品牌名 | 已占 | ⬜ |
| 6 | `sidebar.panellist` | 面板图标栏 | 已占 | ⬜ |
| 7 | `sidebar.workspaces` | 工作区列表 | 已占 | ⬜ |
| 8 | `sidebar.workspaces.directoryFlow` | 工作区目录流 | **空** | ⬜ |
| 9 | `sidebar.footer.action` | 侧栏底部动作 | **空** | ⬜ |
| 10 | `sidebar.settings` | 侧栏设置座 | 已占 | ⬜ |
| 11 | `settings.launcher` | 设置启动器 | 已占 | ⬜ |
| 12 | `settings.trigger` | 设置触发钮 | 已占 | ⬜ |
| 13 | `settings.onboarding` | 设置引导 | **空** | ⬜ |

### 2.3 主区 / 对话区

| # | 槽位 | 中文名 | 状态 | Cuckoo 评估 |
|---|---|---|---|---|
| 14 | `main` | 主区 | 已占 | ⬜ |
| 15 | `main.conversation` | 主对话区 | 已占 | ⬜ |
| 16 | `conversation.header` | 对话头部 | 已占 | ⬜ |
| 17 | `conversation.header.leading` | 头部左区 | **空** | ⬜ |
| 18 | `conversation.session.header` | 会话头部 | 已占 | ⬜ |
| 19 | `conversation.session.header.corner` | 会话头部角 | **空** | ⬜ |
| 20 | `conversation.session` | 会话正文 | **空** | ⬜ |
| 21 | `conversation.composer` | 输入区 | 已占 | ⬜ |
| 22 | `conversation.hero.brand.mark` | 空态品牌图标 | 已占 | ⬜ |
| 23 | `conversation.hero.workspace` | 空态工作区 | 已占 | ⬜ |
| 24 | `conversation.hero.workspace.directoryFlow` | 空态工作区目录流 | **空** | ⬜ |
| 25 | `conversation.hero.agentPreset` | 空态智能体预设 | 已占 | ⬜ |

### 2.4 输入区

| # | 槽位 | 中文名 | 状态 | Cuckoo 评估 |
|---|---|---|---|---|
| 26 | `conversation.input.dock` | 输入停靠区 | **空** | ⬜ |
| 27 | `conversation.composer.bar` | 输入条 | 已占 | ⬜ |
| 28 | `conversation.input.overlay` | 输入浮层 | 已占 | ⬜ |
| 29 | `conversation.input.attachments` | 输入附件 | **空** | ⬜ |
| 30 | `conversation.input.permission` | 输入权限位 | 已占 | ⬜ |
| 31 | `conversation.input.plan` | 输入计划位 | **空** | ⬜ |
| 32 | `conversation.input.left` | 输入左区 | **空** | ⬜ |
| 33 | `conversation.input.right` | 输入右区 | **空** | ⬜ |
| 34 | `conversation.input.model` | 输入模型位 | 已占 | ⬜ |
| 35 | `conversation.input.activity` | 输入活动位 | **空** | ⬜ |

### 2.5 右栏

| # | 槽位 | 中文名 | 状态 | Cuckoo 评估 |
|---|---|---|---|---|
| 36 | `rightbar` | 右栏 | 已占 | ⬜ |
| 37 | `rightbar.session` | 右栏会话 | 已占 | ⬜ |
| 38 | `sidebar.right.pane.tab.title` | 右栏标签标题 | 已占 | ⬜ |
| 39 | `sidebar.right.tab.guide` | 右栏引导 | 已占 | ⬜ |
| 40 | `sidebar.right.tab.guide.entry` | 右栏引导条目 | 已占 | ⬜ |

---

## 三、空槽位速查（可直接演示）

| 槽位 | 中文名 | 区域 |
|---|---|---|
| `shell.overlay` | 全局浮层 | 全局 |
| `sidebar.workspaces.directoryFlow` | 工作区目录流 | 左栏 |
| `sidebar.footer.action` | 侧栏底部动作 | 左栏 |
| `settings.onboarding` | 设置引导 | 左栏 |
| `conversation.header.leading` | 头部左区 | 对话 |
| `conversation.session.header.corner` | 会话头部角 | 对话 |
| `conversation.session` | 会话正文 | 对话 |
| `conversation.hero.workspace.directoryFlow` | 空态工作区目录流 | 对话 |
| `conversation.input.dock` | 输入停靠区 | 输入 |
| `conversation.input.attachments` | 输入附件 | 输入 |
| `conversation.input.plan` | 输入计划位 | 输入 |
| `conversation.input.left` | 输入左区 | 输入 |
| `conversation.input.right` | 输入右区 | 输入 |
| `conversation.input.activity` | 输入活动位 | 输入 |

---

## 四、逐个评估（待填充）

> 每次评估一个槽位，填上"Cuckoo 要不要做、怎么做、对应现有位置"。

| 槽位 | 决定 | 说明 |
|---|---|---|
| （待第一个）| ⬜ | |

---

## 五、相关

- 截图：`dsh-all-slots.png`（全槽位标注）、`dsh-slot-inject.png`（注入演示）
- 现有 Cuckoo UI 机制：`docs/plugin-system.md`（`ctx.ui` / `ctx.ui.overlay`）
- 需求档案：`docs/requirements/022-dsh-plugin-compat.md`
