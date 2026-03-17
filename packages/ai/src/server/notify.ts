import { createNotifier, type Notifier, type NotifyResult, type ArticleRef, type ModelInfo, type TokenUsage, type PhaseTiming } from '@astro-minimax/notify';
import type { UIMessage } from 'ai';

interface NotifyEnv {
  NOTIFY_TELEGRAM_BOT_TOKEN?: string;
  NOTIFY_TELEGRAM_CHAT_ID?: string;
  NOTIFY_WEBHOOK_URL?: string;
  NOTIFY_RESEND_API_KEY?: string;
  NOTIFY_RESEND_FROM?: string;
  NOTIFY_RESEND_TO?: string;
  SITE_URL?: string;
  [key: string]: unknown;
}

let notifierInstance: Notifier | null = null;

function getNotifier(env: NotifyEnv): Notifier | null {
  if (notifierInstance) return notifierInstance;
  
  const hasConfig = env.NOTIFY_TELEGRAM_BOT_TOKEN || env.NOTIFY_WEBHOOK_URL || env.NOTIFY_RESEND_API_KEY;
  if (!hasConfig) return null;

  notifierInstance = createNotifier({
    telegram: env.NOTIFY_TELEGRAM_BOT_TOKEN && env.NOTIFY_TELEGRAM_CHAT_ID ? {
      botToken: env.NOTIFY_TELEGRAM_BOT_TOKEN,
      chatId: env.NOTIFY_TELEGRAM_CHAT_ID,
    } : undefined,
    webhook: env.NOTIFY_WEBHOOK_URL ? {
      url: env.NOTIFY_WEBHOOK_URL,
    } : undefined,
    email: env.NOTIFY_RESEND_API_KEY && env.NOTIFY_RESEND_FROM && env.NOTIFY_RESEND_TO ? {
      provider: 'resend',
      apiKey: env.NOTIFY_RESEND_API_KEY,
      from: env.NOTIFY_RESEND_FROM,
      to: env.NOTIFY_RESEND_TO,
    } : undefined,
  });

  return notifierInstance;
}

function getMessageText(message: UIMessage): string {
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map(p => p.text)
      .join('');
  }
  return '';
}

export interface ChatNotifyOptions {
  env: NotifyEnv;
  sessionId: string;
  messages: UIMessage[];
  aiResponse?: string;
  referencedArticles?: ArticleRef[];
  model?: ModelInfo;
  usage?: TokenUsage;
  timing?: PhaseTiming;
}

export function notifyAiChat(options: ChatNotifyOptions): Promise<NotifyResult | null> {
  const { env, sessionId, messages, aiResponse, referencedArticles, model, usage, timing } = options;
  
  const notifier = getNotifier(env);
  if (!notifier) {
    return Promise.resolve(null);
  }

  const userMessages = messages.filter(m => m.role === 'user');
  const lastUserMessage = userMessages[userMessages.length - 1];
  
  if (!lastUserMessage) {
    return Promise.resolve(null);
  }

  const userMessage = getMessageText(lastUserMessage);
  const roundNumber = userMessages.length;
  
  return notifier.aiChat({
    sessionId,
    roundNumber,
    userMessage,
    aiResponse: aiResponse?.slice(0, 500),
    referencedArticles,
    model,
    usage,
    timing,
    siteUrl: env.SITE_URL,
  }).catch((error) => {
    console.error('[notify] AI chat notification failed:', error);
    return null;
  });
}