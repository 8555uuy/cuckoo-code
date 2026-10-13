# 维护者指南（Maintainer Guide）

> 面向维护者（含 AI 助手）：记录**合并外部贡献**时的流程、约定与易漏点。

## 一、合并外部 PR 的流程

### 1. 审查

- 用 `git fetch` 拉取 PR 分支，或读 GitHub PR 页面（`gh` 不可用时用 GitHub API）。
- 确认改动范围、是否有无关文件、是否触碰项目铁律（依赖方向 / D12 工具契约 / 生成物禁手改）。
- 编译验证：`npm run typecheck && npm run compile && npm test`。

### 2. 合并方式（两种）

| 方式 | 场景 | GitHub 状态 |
|---|---|---|
| **GitHub merge 按钮**（或 rebase-merge） | 纯外部贡献、改动干净 | `merged: true` |
| **本地手动合并** | 需要**选择性合并**（剥离子代理等）、或贡献者分支有额外噪音 | **`merged: false`（仅 closed）** |

**手动合并的做法**（本项目常用）：

```bash
# 1) 拉取贡献者分支到本地
git fetch <remote> <branch>
git checkout -b <临时分支> FETCH_HEAD
# 2) 剥离不要的部分（git rm / git checkout master -- <path>）
# 3) 合并到 master
git checkout master
git merge --no-ff <临时分支>
```

> ⚠️ **手动合并后，GitHub 上 PR 会显示 closed 而非 merged**——这是正常的，不代表贡献被拒。
> 需在 PR 页面**补一条评论**说明（见下「鸣谢」）。

### 3. 鸣谢（**易漏！务必执行**）

**每个被合并的外部贡献，都要在 README 致谢区补记**：

| 文件 | 章节 |
|---|---|
| `README.md` | `## 致谢` |
| `README.en.md` | `## Acknowledgements` |

**格式**（中英文各一条，按贡献者聚合，一个贡献者一个 `- [@xxx]` 块，其下按 PR 列子项）：

```markdown
- [@贡献者](https://github.com/贡献者)：
  - **功能标题**：一句话描述（PR #NN）
```

**同时**：若为手动合并，在对应 PR 页面补评论（中英可选）：

> 感谢贡献！本 PR 的代码已手动合并进 master（提交 `<sha>`，与 PR head `<head-sha>` 内容一致）。
> 因是手动 cherry-pick 合入（未走 GitHub merge 按钮），PR 状态显示为 closed 而非 merged，特此说明。
> 功能已在 `<版本>` 发布，README 致谢区已补记本 PR。

## 二、检查清单（合并外部 PR 后逐项确认）

- [ ] 代码已合并到 master（`git merge-base --is-ancestor <sha> master`）
- [ ] `README.md` 致谢区已补记
- [ ] `README.en.md` 致谢区已补记
- [ ] 手动合并时：PR 页面已补说明评论
- [ ] 若发版：`release-notes/vX.Y.Z.md` 提及贡献者
- [ ] typecheck / compile / test 全绿

## 三、历史遗留教训

- **PR #36**（@ZiJiangel 可执行插件系统 + 主题系统）：手动经 `f226a16` 合入，长期**漏了 README 致谢**，事后补记。→ 本指南的由来。
- **PR #49**（@brownie19850318）：选择性合并，已在 README 致谢。

## 四、其他维护约定

- 生成物（`*.generated.ts`、`api.d.ts`、`hook-sources.ts`）禁手改，改源后 `npm run compile` 重新生成。
- 需求改动建 `docs/requirements/NNN-*.md` 档案 + 分支；纯文档修正可直接提交 master。
- 每个需求文档正文固定五节：背景 / 目标 / 方案 / 验收标准 / 遗留。
