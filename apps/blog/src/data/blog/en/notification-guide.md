---
title: "Blog Notification System Configuration Guide"
pubDatetime: 2026-03-17T00:00:00.000Z
author: Souloss
description: "Learn how to configure the multi-channel notification system for astro-minimax blog, supporting Telegram, Email, and Webhook for real-time comment and AI chat notifications."
tags:
  - docs
  - notification
  - telegram
  - email
category: Tutorial/Configuration
featured: false
draft: false
---

astro-minimax includes a built-in multi-channel notification system that automatically sends notifications to Telegram, Email, or custom Webhooks when your blog receives comments or users interact with the AI chat.

## Feature Overview

The notification system supports:

| Feature            | Description                                    |
| ------------------ | ---------------------------------------------- |
| Multi-channel      | Telegram Bot, Email (Resend), Webhook          |
| Multi-event        | New comments, AI conversations                 |
| Rich information   | Token usage, phase timing, referenced articles |
| Privacy protection | Automatic Session ID anonymization             |

## Environment Variables

The notification system is configured via environment variables, all prefixed with `NOTIFY_`.

### Telegram Bot Configuration

```bash
# Notify - Telegram Provider
NOTIFY_TELEGRAM_BOT_TOKEN=your-bot-token
NOTIFY_TELEGRAM_CHAT_ID=your-chat-id
```

#### Getting Bot Token

1. Search for `@BotFather` in Telegram
2. Send `/newbot` to create a new Bot
3. Follow the prompts to set the Bot name
4. Receive the Token (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

#### Getting Chat ID

1. Search for `@userinfobot` in Telegram
2. Send `/start`
3. Receive your Chat ID (a pure number like `123456789`)

> [!TIP]
> Chat ID can be a personal chat, group, or channel. When sending to a group, the Bot must be a group administrator.

### Email Configuration (Resend)

```bash
# Notify - Email Provider (Resend)
NOTIFY_RESEND_API_KEY=re_xxx
NOTIFY_RESEND_FROM=noreply@yourdomain.com
NOTIFY_RESEND_TO=you@example.com
```

#### Getting Resend API Key

1. Sign up for a [Resend](https://resend.com) account
2. Click "Create API Key" in the Dashboard
3. Copy the generated API Key (format: `re_xxx`)

> [!NOTE]
> When using Resend's test domain (`onboarding@resend.dev`), you can only send to the email address you used to register for Resend. For production use, you need to verify your own domain.

### Webhook Configuration

```bash
# Notify - Webhook Provider
NOTIFY_WEBHOOK_URL=https://your-webhook.com/notify
```

The webhook receives a POST request with JSON format:

```json
{
  "event": "comment",
  "timestamp": "2026-03-17T12:00:00.000Z",
  "data": {
    "author": "John",
    "content": "Great article!",
    "postTitle": "How to Use Astro",
    "postUrl": "https://example.com/posts/how-to-use-astro"
  }
}
```

## Configuration Example

Add complete configuration to your `.env` file:

```bash
# Notify - Telegram Provider
NOTIFY_TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
NOTIFY_TELEGRAM_CHAT_ID=123456789

# Notify - Email Provider (Resend)
NOTIFY_RESEND_API_KEY=re_xxx
NOTIFY_RESEND_FROM=noreply@yourdomain.com
NOTIFY_RESEND_TO=you@example.com

# Notify - Webhook Provider (Optional)
NOTIFY_WEBHOOK_URL=https://your-webhook.com/notify
```

## Notification Preview

### Comment Notification

```
💬 New Comment

📖 Post: How to Use Astro
👤 Author: John

"Great article!"

🔗 View Comment
```

### AI Chat Notification

```
🗣 Blog AI Chat

👤 a1b2***f6 · 🕐 03-17 12:30 · Round 3

❓ User:
"Hello, testing AI chat notification"

💬 AI:
Hello! AI chat notification test successful...

📎 Referenced Articles:
  · Kyoto Marathon
  · Tokyo Travel

⚙️ Model Config:
  · API Host: api.openai.com
  · Model: gpt-4

🧮 Token Usage:
  · Total: 1,089 / Input: 500 / Output: 589

⏱️ Phase Timing:
  · Total: 15.50s
  · Generation: 15.49s
```

## Waline Comment Notification Integration

If your blog uses the [Waline](https://waline.js.org/) comment system, you can configure a webhook to trigger notifications:

### Configure Waline Webhook

Add to your Waline server configuration:

```yaml
# Waline server environment variables
WEBHOOK=https://your-blog.pages.dev/api/notify/comment
```

Or in `vercel.json` / `netlify.toml`:

```json
{
  "env": {
    "WEBHOOK": "https://your-blog.pages.dev/api/notify/comment"
  }
}
```

### API Endpoints

The notification system provides the following API endpoint:

| Endpoint                   | Description                           |
| -------------------------- | ------------------------------------- |
| `POST /api/notify/comment` | Comment notification (Waline Webhook) |

## Custom Templates

To customize notification formats, create a custom notifier in your code:

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
        text: `📬 New Comment\n\n${event.author}: ${event.content}`,
        parse_mode: 'HTML',
      }),
    },
    'ai-chat': {
      telegram: (event) => ({
        text: `🤖 AI Chat\n\nUser: ${event.userMessage}`,
        parse_mode: 'HTML',
      }),
    },
  },
});
```

## Proxy Configuration

If your server requires a proxy to access external APIs:

```bash
# HTTP/HTTPS Proxy
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
```

The notification system will automatically detect and use the proxy.

## Troubleshooting

### Notification Send Failed

1. **Check environment variables**: Ensure all required variables are correctly configured
2. **Check network**: Ensure the server can access Telegram API (`api.telegram.org`) and Resend API (`api.resend.com`)
3. **Check logs**: Notification failures are logged with error details

### Telegram Notification Failed

- Verify Bot Token is correct
- Verify Chat ID is correct
- If sending to a group, ensure Bot is a group administrator

### Email Notification Failed

- Verify Resend API Key is valid
- Verify sender domain is verified
- Check spam folder for emails

## Architecture

The notification system is a standalone package `@astro-minimax/notify`:

```
packages/notify/
├── src/
│   ├── providers/    # Channel providers
│   │   ├── telegram.ts
│   │   ├── email.ts
│   │   └── webhook.ts
│   ├── templates/    # Notification templates
│   └── types.ts      # Type definitions
└── README.md
```

### Design Principles

- **Fault tolerance**: Single channel failure doesn't affect other channels or main business
- **Parallel sending**: All configured channels send notifications in parallel
- **Minimal configuration**: Only configure the channels you need

## Summary

The astro-minimax notification system provides simple yet powerful multi-channel notification capabilities. With just a few environment variables, you can receive real-time notifications for blog comments and AI conversations, helping you stay informed about your blog's activity.
