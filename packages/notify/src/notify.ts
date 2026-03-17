import type {
  NotifyConfig,
  NotifyEvent,
  CommentEvent,
  AiChatEvent,
  NotifyResult,
  SendResult,
  Notifier,
  EventTemplates,
  Logger,
  Channel,
} from './types.js';
import {
  createTelegramProvider,
  createWebhookProvider,
  createEmailProvider,
  type TelegramProvider,
  type WebhookProvider,
  type EmailProvider,
} from './providers/index.js';
import { defaultTemplates } from './templates/index.js';

class DefaultLogger implements Logger {
  info(message: string, data?: Record<string, unknown>): void {
    console.log(`[notify] ${message}`, data ?? '');
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    console.error(`[notify] ${message}`, error?.message ?? '', data ?? '');
  }

  warn(message: string, data?: Record<string, unknown>): void {
    console.warn(`[notify] ${message}`, data ?? '');
  }
}

interface Providers {
  telegram?: TelegramProvider;
  webhook?: WebhookProvider;
  email?: EmailProvider;
}

function mergeTemplates(
  custom?: Partial<EventTemplates>
): EventTemplates {
  if (!custom) return defaultTemplates;

  return {
    comment: {
      telegram: custom.comment?.telegram ?? defaultTemplates.comment.telegram,
      webhook: custom.comment?.webhook ?? defaultTemplates.comment.webhook,
      email: custom.comment?.email ?? defaultTemplates.comment.email,
    },
    'ai-chat': {
      telegram: custom['ai-chat']?.telegram ?? defaultTemplates['ai-chat'].telegram,
      webhook: custom['ai-chat']?.webhook ?? defaultTemplates['ai-chat'].webhook,
      email: custom['ai-chat']?.email ?? defaultTemplates['ai-chat'].email,
    },
  };
}

// Singleton instance and its config hash for caching
let notifierInstance: Notifier | null = null;
let lastConfigHash: string | null = null;

/**
 * Computes a simple hash of the notify config for singleton caching.
 * Only includes fields that affect provider creation.
 */
function computeConfigHash(config: NotifyConfig): string {
  const parts: string[] = [];
  if (config.telegram) {
    parts.push(`telegram:${config.telegram.botToken}:${config.telegram.chatId}`);
  }
  if (config.webhook) {
    parts.push(`webhook:${config.webhook.url}`);
  }
  if (config.email) {
    parts.push(`email:${config.email.provider}:${config.email.apiKey}:${config.email.from}:${config.email.to}`);
  }
  return parts.join('|');
}

/**
 * Returns a cached notifier instance if the config matches the previous one.
 * Creates a new instance only when the config changes.
 * This optimization avoids recreating provider instances on every request.
 */
export function getNotifier(config: NotifyConfig): Notifier {
  const hash = computeConfigHash(config);
  
  if (notifierInstance && hash === lastConfigHash) {
    return notifierInstance;
  }
  
  notifierInstance = createNotifier(config);
  lastConfigHash = hash;
  return notifierInstance;
}

/**
 * Resets the singleton instance (useful for testing).
 */
export function resetNotifier(): void {
  notifierInstance = null;
  lastConfigHash = null;
}

export function createNotifier(config: NotifyConfig): Notifier {
  const logger = config.logger ?? new DefaultLogger();
  const templates = mergeTemplates(config.templates);

  const providers: Providers = {};

  if (config.telegram) {
    providers.telegram = createTelegramProvider(config.telegram, logger);
  }

  if (config.webhook) {
    providers.webhook = createWebhookProvider(config.webhook, logger);
  }

  if (config.email) {
    providers.email = createEmailProvider(config.email, logger);
  }

  const hasProviders = Object.keys(providers).length > 0;
  if (!hasProviders) {
    logger.warn('No notification providers configured');
  }

  async function sendToAll(event: NotifyEvent): Promise<NotifyResult> {
    if (!hasProviders) {
      return {
        event: event.type,
        results: [],
        success: false,
      };
    }

    const results: SendResult[] = [];
    const eventType = event.type;
    const eventTemplates = templates[eventType];

    const sendPromises: Promise<{ channel: Channel; result: SendResult }>[] = [];

    if (providers.telegram) {
      sendPromises.push(
        providers.telegram.send(eventTemplates.telegram(event as never))
          .then(result => {
            logger.info('Telegram notification result', { success: result.success, duration: result.duration });
            return { channel: 'telegram' as const, result };
          })
          .catch(error => ({
            channel: 'telegram' as const,
            result: { channel: 'telegram' as const, success: false, error: error?.message ?? 'Unknown error' },
          }))
      );
    }

    if (providers.webhook) {
      sendPromises.push(
        providers.webhook.send(eventTemplates.webhook(event as never))
          .then(result => {
            logger.info('Webhook notification result', { success: result.success, duration: result.duration });
            return { channel: 'webhook' as const, result };
          })
          .catch(error => ({
            channel: 'webhook' as const,
            result: { channel: 'webhook' as const, success: false, error: error?.message ?? 'Unknown error' },
          }))
      );
    }

    if (providers.email) {
      sendPromises.push(
        providers.email.send(eventTemplates.email(event as never))
          .then(result => {
            logger.info('Email notification result', { success: result.success, duration: result.duration });
            return { channel: 'email' as const, result };
          })
          .catch(error => ({
            channel: 'email' as const,
            result: { channel: 'email' as const, success: false, error: error?.message ?? 'Unknown error' },
          }))
      );
    }

    const settledResults = await Promise.allSettled(sendPromises);

    for (const settled of settledResults) {
      if (settled.status === 'fulfilled') {
        results.push(settled.value.result);
      }
    }

    const success = results.some(r => r.success);

    return {
      event: eventType,
      results,
      success,
    };
  }

  return {
    async comment(event: Omit<CommentEvent, 'type'>): Promise<NotifyResult> {
      const fullEvent: CommentEvent = {
        ...event,
        type: 'comment',
        timestamp: new Date(),
      };
      return sendToAll(fullEvent);
    },

    async aiChat(event: Omit<AiChatEvent, 'type'>): Promise<NotifyResult> {
      const fullEvent: AiChatEvent = {
        ...event,
        type: 'ai-chat',
        timestamp: new Date(),
      };
      return sendToAll(fullEvent);
    },

    async send(event: NotifyEvent): Promise<NotifyResult> {
      const fullEvent = {
        ...event,
        timestamp: event.timestamp ?? new Date(),
      };
      return sendToAll(fullEvent);
    },
  };
}