# AI 网关插件（源备份）

> 这个目录是 **ai-gateway 插件的源码备份**，不是应用代码。
> 实际运行位置：`~/.cuckoo/plugins/ai-gateway/`（用户目录，被 .gitignore 忽略）。

## 它做什么

把 Cuckoo 的 AI 网页版暴露成 **OpenAI 兼容 API**，让局域网设备（手机 / LobeChat / 任何支持 OpenAI 的客户端）直接调用。
另附管理网站（Key 管理 / 请求日志）。

## 关键设计

- **独立隐藏窗口**：每次请求开一个隐藏窗口（照抄子代理机制），工具循环天然正常，不污染用户对话。
- **流式思考**：思考 → `reasoning_content`，正文 → `content`（像真 API）。
- **剥离工具代码块**：不把 `cuckoo` 代码块发给客户端（客户端看不懂），只发最终答案。
- **丢弃客户端 system**：Cuckoo 有自己的完整系统提示词，避免两套提示词打架。
- **IPC 驱动面板**：侧边栏面板走 `pluginHostCall` IPC（不用 fetch，避开 file:// + 代理拦截）。

## 文件

| 文件 | 作用 |
|------|------|
| `plugin.json` | 插件清单（端口/密码/开关等配置项） |
| `providers/gateway.js` | 入口：HTTP 服务 + 路由 + 启停 |
| `lib/ai-driver.js` | 找 AI 页面 / 父窗口 |
| `lib/ai-inject.js` | 注入输入框（复刻 overlay/chat-input.ts） |
| `lib/openai-api.js` | OpenAI 协议转换 |
| `lib/keystore.js` | API Key 管理 |
| `lib/admin-html.js` | 管理网站（内联单页） |
| `ui/gateway-panel.js` | 侧边栏面板 |

## 安装

把本目录内容复制到 `~/.cuckoo/plugins/ai-gateway/`，重启 Cuckoo 即可。

## 客户端配置

```
Base URL:  http://<局域网IP>:18900/v1
API Key:   （管理网站里创建的 sk-cuckoo-...）
Model:     cuckoo-default
```
