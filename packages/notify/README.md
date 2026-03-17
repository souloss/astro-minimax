# @astro-minimax/notify

多渠道通知包，为 astro-minimax 博客系统提供灵活的通知功能。

## 特性

- **多渠道支持**：Telegram、Email (Resend)、Webhook
- **多事件类型**：评论通知、AI 对话监控
- **丰富信息展示**：Token 用量、阶段耗时、引用文章等
- **隐私保护**：Session ID 自动匿名化
- **代理支持**：支持 HTTP/HTTPS 代理
- **容错设计**：失败不影响主业务流程

## 安装

```bash
pnpm add @astro-minimax/notify
```

## 环境变量配置

### Telegram Provider

```bash
NOTIFY_TELEGRAM_BOT_TOKEN=your-bot-token
NOTIFY_TELEGRAM_CHAT_ID=your-chat-id
```

获取方式：

1. 在 Telegram 搜索 `@BotFather`，发送 `/newbot` 创建 Bot，获取 Token
2. 在 Telegram 搜索 `@userinfobot`，发送 `/start` 获取你的 Chat ID

### Email Provider (Resend)

```bash
NOTIFY_RESEND_API_KEY=re_xxx
NOTIFY_RESEND_FROM=noreply@yourdomain.com
NOTIFY_RESEND_TO=you@example.com
```

获取方式：

1. 注册 [Resend](https://resend.com) 账号
2. 在 Dashboard 创建 API Key
3. 验证发件域名

### Webhook Provider

```bash
NOTIFY_WEBHOOK_URL=https://your-webhook.com/notify
```

## 使用方式

### 基础用法

```typescript
import { createNotifier } from '@astro-minimax/notify';

const notifier = createNotifier({
  telegram: {
    botToken: process.env.NOTIFY_TELEGRAM_BOT_TOKEN,
    chatId: process.env.NOTIFY_TELEGRAM_CHAT_ID,
  },
  email: {
    provider: 'resend',
    apiKey: process.env.NOTIFY_RESEND_API_KEY,
    from: process.env.NOTIFY_RESEND_FROM,
    to: process.env.NOTIFY_RESEND_TO,
  },
  webhook: {
    url: process.env.NOTIFY_WEBHOOK_URL,
  },
});

// 发送评论通知
await notifier.comment({
  author: '张三',
  content: '文章写得真好！',
  postTitle: '如何使用 Astro',
  postUrl: 'https://example.com/posts/how-to-use-astro',
});

// 发送 AI 对话通知
await notifier.aiChat({
  sessionId: 'abc123',
  roundNumber: 1,
  userMessage: '你好',
  aiResponse: '你好！有什么可以帮助你的？',
  model: {
    name: 'gpt-4',
    provider: 'openai',
  },
  usage: {
    total: 100,
    input: 50,
    output: 50,
  },
  timing: {
    total: 1500,
    generation: 1400,
  },
});
```

### 自定义模板

```typescript
const notifier = createNotifier({
  telegram: { botToken, chatId },
  templates: {
    comment: {
      telegram: (event) => ({
        text: `📬 新评论\n\n${event.author}: ${event.content}`,
        parse_mode: 'HTML',
      }),
    },
  },
});
```

## API

### `createNotifier(config: NotifyConfig): Notifier`

创建通知器实例。

#### NotifyConfig

```typescript
interface NotifyConfig {
  telegram?: {
    botToken: string;
    chatId: string;
  };
  webhook?: {
    url: string;
    method?: 'POST';
    headers?: Record<string, string>;
  };
  email?: {
    provider: 'resend';
    apiKey: string;
    from: string;
    to: string;
  };
  templates?: Partial<EventTemplates>;
  logger?: Logger;
}
```

#### Notifier

```typescript
interface Notifier {
  comment(event: Omit<CommentEvent, 'type'>): Promise<NotifyResult>;
  aiChat(event: Omit<AiChatEvent, 'type'>): Promise<NotifyResult>;
  send(event: NotifyEvent): Promise<NotifyResult>;
}
```

### 事件类型

#### CommentEvent

```typescript
interface CommentEvent {
  type: 'comment';
  author: string;
  content: string;
  postTitle: string;
  postUrl: string;
}
```

#### AiChatEvent

```typescript
interface AiChatEvent {
  type: 'ai-chat';
  sessionId: string;
  roundNumber: number;
  userMessage: string;
  aiResponse?: string;
  referencedArticles?: Array<{ title: string; url?: string }>;
  model?: {
    name: string;
    provider?: string;
    apiHost?: string;
  };
  usage?: {
    total: number;
    input: number;
    output: number;
  };
  timing?: {
    total: number;
    keywordExtraction?: number;
    search?: number;
    generation?: number;
  };
}
```

## 通知效果

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
  · 2026 年个人技术博客生态全览：从零构建你的博客系统
  · 为什么选择 astro-minimax：设计决策与技术思考

⚙️ 模型配置:
  · API Host: api.openai.com
  · 主对话模型: gpt-4

🧮 Token 用量:
  · 本次请求合计: 总 1,089 / 入 500 / 出 589

⏱️ 阶段耗时:
  · 总耗时: 15.50s
  · 文本生成: 15.49s
```

## License

MIT
