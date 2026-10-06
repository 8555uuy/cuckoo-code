---
id: 024
type: feature
title: 记忆系统 + 工作快照
status: draft
branch: feat/024-memory-snapshot
created: 2026-10-06
updated: 2026-10-06
---

## 背景

好的 Agent 应该"记得住用户习惯"且"改坏能收回"。当前项目两者都缺：

- **无记忆**：用户偏好（如"用中文回复""提交信息格式"）每轮都要重说，跨会话丢失
- **无快照**：模型大范围改动前无法存档，改坏只能靠 git 兜底（未提交的改动会丢）

本需求新增两个独立模块，均在左侧边栏加 tab。

## 目标

### 模块 A：记忆系统

- 用户级存储 `~/.cuckoo/memories.json`（跨项目，可用 `CUCKOO_HOME` 覆盖）
- 系统提示词注入「## 用户记忆」章节，让模型了解用户习惯
- 工具 `remember(text)` / `forgetMemory(id)`：模型主动记忆/遗忘
- 侧边栏「记忆」tab：列出 / 新建 / 编辑 / 删除

### 模块 B：快照系统

- 用户级存储 `~/.cuckoo/snapshots/<id>/`（`meta.json` + `files/` 副本）
- 工具 `createSnapshot(name, description?)` / `listSnapshots()` / `restoreSnapshot(id)`
- 快照当前项目目录（排除 `.git`/`node_modules`/`dist`/`out` 等产物）
- 恢复前需确认（破坏性操作）
- 侧边栏「快照」tab：列出 / 创建 / 恢复 / 删除

## 方案

### 存储层（主进程，src/app/）

- `src/app/memories.ts`：仿 `snippets.ts`，读写 `memories.json`
- `src/app/snapshots.ts`：快照目录管理 + 项目文件复制/恢复

### 提示词注入

- `src/session/prompt-builder.ts` 新增 `{{MEMORY_SECTION}}` 占位符
- `src/prompt/*.md` 各模板加 `{{MEMORY_SECTION}}`

### 工具（src/tools/impl/）

- `remember.ts`、`forget-memory.ts`
- `create-snapshot.ts`、`list-snapshots.ts`、`restore-snapshot.ts`
- 通过 app 层注入的 setter 访问存储（避免 tools → app 反向依赖）

### IPC + UI

- `src/app/ipc/memory.ts`、`src/app/ipc/snapshot.ts`
- `shell-preload.ts` 暴露 API
- 侧边栏 activitybar 加两个图标 + 页面 HTML + 页面 TS

## 验收标准

- [ ] 记忆 CRUD 正常，提示词注入生效
- [ ] 快照创建/列出/恢复/删除正常
- [ ] 侧边栏两个 tab 可交互
- [ ] 工具契约（api.d.ts）自动生成
- [ ] typecheck / test / lint / compile 全绿

## 遗留 / 后续

- 快照暂不含 .git/node_modules（避免体积爆炸）
- 记忆暂不分项目/用户作用域（统一用户级）
