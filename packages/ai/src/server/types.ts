import type { UIMessage } from 'ai';
import type { ProviderManagerEnv } from '../provider-manager/types.js';
import type { CacheEnv } from '../cache/types.js';

// ── Chat Context ──────────────────────────────────────────────

export interface ChatContext {
  scope: 'global' | 'article';
  article?: ArticleChatContext;
}

export interface ArticleChatContext {
  slug: string;
  title: string;
  categories?: string[];
  summary?: string;
  abstract?: string;
  keyPoints?: string[];
  relatedSlugs?: string[];
}

// ── Request / Response ────────────────────────────────────────

export interface ChatRequestBody {
  context?: ChatContext;
  id?: string;
  messages: UIMessage[];
  lang?: string;
}

export interface ChatHandlerEnv extends ProviderManagerEnv, CacheEnv {
  SITE_AUTHOR?: string;
  SITE_URL?: string;
  [key: string]: unknown;
}

export interface ChatHandlerOptions {
  env: ChatHandlerEnv;
  request: Request;
  waitUntil?: (promise: Promise<unknown>) => void;
}

// ── Status Metadata ───────────────────────────────────────────

export type ChatStatusStage = 'search' | 'answer' | 'complete';

export interface ChatStatusData {
  stage: ChatStatusStage;
  message: string;
  progress: number;
  done: boolean;
  at: number;
}

export function createChatStatusData(
  partial: Omit<ChatStatusData, 'done' | 'at'> & { done?: boolean },
): ChatStatusData {
  return {
    ...partial,
    done: partial.done ?? partial.stage === 'complete',
    at: Date.now(),
  };
}

export function isChatStatusData(value: unknown): value is ChatStatusData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.stage === 'string' && typeof v.message === 'string' && typeof v.progress === 'number';
}

// ── Error Response ────────────────────────────────────────────

export interface ChatErrorResponse {
  error: string;
  code: string;
  retryable: boolean;
  retryAfter?: number;
}

// ── Metadata Initialization ───────────────────────────────────

export interface MetadataConfig {
  summaries: unknown;
  authorContext: unknown;
  voiceProfile: unknown;
  factRegistry?: unknown;
  siteUrl?: string;
}
