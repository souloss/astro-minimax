---
title: "博客通知系统配置指南"
pubDatetime: 2026-03-17T00:00:00.000Z
author: Souloss
description: "了解如何配置 astro-minimax 博客的多渠道通知系统，支持 Telegram、邮件和 Webhook，实时接收评论和 AI 对话通知。"
tags:
  - docs
  - notification
  - telegram
  - email
category: 教程/配置
featured: false
draft: false
---

astro-minimax 内置多渠道通知系统，可以在博客收到评论或用户进行 AI 对话时，自动发送通知到 Telegram、邮箱或自定义 Webhook。

## Table of contents

## 功能概览

通知系统支持以下功能：

| 功能     | 说明                                  |
| -------- | ------------------------------------- |
| 多渠道   | Telegram Bot、Email (Resend)、Webhook |
| 多事件   | 新评论、AI 对话                       |
| 丰富信息 | Token 用量、阶段耗时、引用文章等      |
| 隐私保护 | Session ID 自动匿名化                 |

## 环境变量配置

通知系统通过环境变量配置，所有变量以 `NOTIFY_` 开头。

### Telegram Bot 配置

```bash
# Notify - Telegram Provider
NOTIFY_TELEGRAM_BOT_TOKEN=your-bot-token
NOTIFY_TELEGRAM_CHAT_ID=your-chat-id
```

#### 获取 Bot Token

1. 在 Telegram 搜索 `@BotFather`
2. 发送 `/newbot` 创建新 Bot
3. 按提示设置 Bot 名称
4. 获得 Token（格式：`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`）

#### 获取 Chat ID

1. 在 Telegram 搜索 `@userinfobot`
2. 发送 `/start`
3. 获取你的 Chat ID（纯数字，如 `123456789`）

> [!TIP]
> Chat ID 可以是个人私聊、群组或频道。发送到群组时，Bot 需要是群组管理员。

### Email 配置 (Resend)

```bash
# Notify - Email Provider (Resend)
NOTIFY_RESEND_API_KEY=re_xxx
NOTIFY_RESEND_FROM=noreply@yourdomain.com
NOTIFY_RESEND_TO=you@example.com
```

#### 获取 Resend API Key

1. 注册 [Resend](https://resend.com) 账号
2. 在 Dashboard 点击 "Create API Key"
3. 复制生成的 API Key（格式：`re_xxx`）

> [!NOTE]
> 使用 Resend 测试域名 (`onboarding@resend.dev`) 时，只能发送到你在 Resend 注册时使用的邮箱。正式使用需要验证自己的域名。

### Webhook 配置

```bash
# Notify - Webhook Provider
NOTIFY_WEBHOOK_URL=https://your-webhook.com/notify
```

Webhook 会收到 POST 请求，JSON 格式如下：

```json
{
  "event": "comment",
  "timestamp": "2026-03-17T12:00:00.000Z",
  "data": {
    "author": "张三",
    "content": "文章写得真好！",
    "postTitle": "如何使用 Astro",
    "postUrl": "https://example.com/posts/how-to-use-astro"
  }
}
```

## 配置文件示例

在 `.env` 文件中添加完整配置：

```bash
# Notify - Telegram Provider
NOTIFY_TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
NOTIFY_TELEGRAM_CHAT_ID=123456789

# Notify - Email Provider (Resend)
NOTIFY_RESEND_API_KEY=re_xxx
NOTIFY_RESEND_FROM=noreply@yourdomain.com
NOTIFY_RESEND_TO=you@example.com

# Notify - Webhook Provider (可选)
NOTIFY_WEBHOOK_URL=https://your-webhook.com/notify
```

## 通知效果预览

### 评论通知

```
💬 新评论

📖 文章：如何使用 Astro
👤 评论者：张三

「文章写得真好！」

🔗 查看评论
```

### AI 对话通知

```
🗣 博客 AI 对话

👤 a1b2***f6 · 🕐 03-17 12:30 · 第 3 轮

❓ 读者:
「你好，测试 AI 对话通知功能」

💬 AI:
你好！AI 对话通知功能测试成功...

📎 引用文章:
  · 京都马拉松
  · 东京旅行

⚙️ 模型配置:
  · API Host: api.openai.com
  · 主对话模型: gpt-4

🧮 Token 用量:
  · 本次请求合计: 总 1,089 / 入 500 / 出 589

⏱️ 阶段耗时:
  · 总耗时: 15.50s
  · 文本生成: 15.49s
```

## Waline 评论通知集成

如果你的博客使用 [Waline](https://waline.js.org/) 评论系统，可以配置 Webhook 来触发通知：

### 配置 Waline Webhook

在 Waline 服务端配置中添加：

```yaml
# Waline 服务端环境变量
WEBHOOK=https://your-blog.pages.dev/api/notify/comment
```

或者在 `vercel.json` / `netlify.toml` 中：

```json
{
  "env": {
    "WEBHOOK": "https://your-blog.pages.dev/api/notify/comment"
  }
}
```

### Webhook 端点

通知系统提供以下 API 端点：

| 端点                       | 说明                       |
| -------------------------- | -------------------------- |
| `POST /api/notify/comment` | 评论通知（Waline Webhook） |

## 自定义模板

如果需要自定义通知格式，可以在代码中创建自定义通知器：

```typescript
import { createNotifier } from '@astro-minimax/notify';

const notifier = createNotifier({
  telegram: {
    botToken: process.env.NOTIFY_TELEGRAM_BOT_TOKEN,
    chatId: process.env.NOTIFY_TELEGRAM_CHAT_ID,
  },
  templates: {
    comment: {
      telegram: (event) => ({
        text: `📬 新评论\n\n${event.author}: ${event.content}`,
        parse_mode: 'HTML',
      }),
    },
    'ai-chat': {
      telegram: (event) => ({
        text: `🤖 AI 对话\n\n用户: ${event.userMessage}`,
        parse_mode: 'HTML',
      }),
    },
  },
});
```

## 代理配置

如果服务器需要通过代理访问外部 API，可以配置 HTTP 代理：

```bash
# HTTP/HTTPS 代理
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
```

通知系统会自动检测并使用代理。

## 故障排除

### 通知发送失败

1. **检查环境变量**：确保所有必需的变量都已正确配置
2. **检查网络**：确保服务器可以访问 Telegram API (`api.telegram.org`) 和 Resend API (`api.resend.com`)
3. **检查日志**：通知失败会在日志中输出错误信息

### Telegram 通知失败

- 确认 Bot Token 正确
- 确认 Chat ID 正确
- 如果发送到群组，确认 Bot 是群组管理员

### 邮件通知失败

- 确认 Resend API Key 有效
- 确认发件人域名已验证
- 检查邮箱是否在垃圾邮件中

## 架构说明

通知系统作为独立包 `@astro-minimax/notify` 存在：

```
packages/notify/
├── src/
│   ├── providers/    # 渠道提供者
│   │   ├── telegram.ts
│   │   ├── email.ts
│   │   └── webhook.ts
│   ├── templates/    # 通知模板
│   └── types.ts      # 类型定义
└── README.md
```

### 设计原则

- **容错设计**：单个渠道失败不影响其他渠道和主业务
- **并行发送**：所有配置的渠道并行发送通知
- **最小配置**：只需配置需要使用的渠道

## 总结

astro-minimax 通知系统提供了简单而强大的多渠道通知能力。只需配置几个环境变量，就能实时接收博客评论和 AI 对话的通知，帮助你及时了解博客动态。
