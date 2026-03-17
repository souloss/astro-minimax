import type { EventTemplates } from '../types.js';
import * as commentTemplates from './comment.js';
import * as aiChatTemplates from './ai-chat.js';

export const defaultTemplates: EventTemplates = {
  comment: {
    telegram: commentTemplates.telegramTemplate,
    webhook: commentTemplates.webhookPayload,
    email: commentTemplates.emailTemplate,
  },
  'ai-chat': {
    telegram: aiChatTemplates.telegramTemplate,
    webhook: aiChatTemplates.webhookPayload,
    email: aiChatTemplates.emailTemplate,
  },
};