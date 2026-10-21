# AI 网关（Cuckoo Code 插件）

> ⚠️ **重要：本插件目前仅适用于作者的 fork**
>
> 本插件的 AI 查询能力依赖一个主进程桥接入口 `globalThis.__cuckooRunGatewayQuery`，
> **该入口尚未合入官方 Cuckoo Code**（含 0.8.13）。
>
> - ✅ 可用：`8555uuy/cuckoo-code` 的 `personal/full` 分支
> - ❌ 不可用：官方 `wangyongpeng90/cuckoo-code`（装了也只会 503）
>
> 已知问题见 [Issue #1](https://github.com/8555uuy/cuckoo-plugin-ai-gateway/issues/1)。
> 上游合并后会更新本说明。

> ⚠️ **免责声明**
>
> 本插件为开源工具，按"原样"提供，不附带任何明示或默示的担保。
> 使用本插件即表示你理解并同意：
>
> 1. **默认配置有风险** —— 插件默认绑定 `0.0.0.0`（局域网可访问），管理密码默认为 `admin`。
>    若未修改密码或限制访问，**同一网络下的任何设备都可能访问你的 AI 网关**，存在密钥泄露、被他人滥用的风险。
> 2. **后果自负** —— 你应自行承担使用本插件产生的一切后果，包括但不限于密钥泄露、被他人滥用、产生额外费用、违反上游 AI 服务条款等。
> 3. **建议** —— 仅在可信网络中使用，并**立即修改默认管理密码**。

把 Cuckoo 的 AI 网页版暴露成 **OpenAI 兼容 API**，让局域网设备（手机 / LobeChat / 任何支持 OpenAI 的客户端）直接调用。附管理网站（Key 管理 / 请求日志）。

## 前置条件

- **Cuckoo Code 必须是作者的 fork**（`8555uuy/cuckoo-code` 的 `personal/full` 分支）。
  官方版缺少 `__cuckooRunGatewayQuery` 入口，请求会一直返回 503。
- 需要至少一个已打开的 AI 窗口（网关会借用它执行查询）。

## 安装

在 Cuckoo Code 的「插件市场」搜索 **AI 网关**，一键安装。

或手动：
```bash
# 把本仓库内容放到 ~/.cuckoo/plugins/ai-gateway/
```

## 客户端配置

```
Base URL:  http://<本机局域网IP>:18900/v1
API Key:   （管理网站里创建的 sk-cuckoo-...）
Model:     cuckoo-default
```

## 功能

- **OpenAI 兼容 API**：`/v1/chat/completions`（流式 + 非流式）、`/v1/models`
- **独立隐藏窗口**：每次请求开一个隐藏窗口，工具循环天然正常，不污染你的对话
- **流式思考**：思考 → `reasoning_content`，正文 → `content`（像真 API）
- **管理网站**：Key 管理、请求日志、启停开关
- **侧边栏面板**：一键查看地址、开关网关、整活模式

## 安全（必读）

- ⚠️ 默认绑定 `0.0.0.0`（局域网可访问）——想只本机用，把 host 改成 `127.0.0.1`
- ⚠️ 管理密码默认 `admin`，**务必改掉**
- 可要求 API Key（默认开）
- 建议仅在可信网络使用

## 许可证

MIT
