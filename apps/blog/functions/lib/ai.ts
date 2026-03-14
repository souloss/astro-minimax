/* eslint-disable no-console */
import {
  ProviderManager,
  hasAnyProviderConfigured,
  preloadMetadata,
  getAuthorContext,
  initArticleIndex,
  initProjectIndex,
  getAllSummaries,
  type ProviderManagerEnv,
  type ProviderStatus,
} from '@astro-minimax/ai';
import type { AuthorPost, SearchDocument } from '@astro-minimax/ai';

import aiSummaries from '../../datas/ai-summaries.json';
import authorContextJson from '../../datas/author-context.json';
import voiceProfile from '../../datas/voice-profile.json';

export interface FunctionEnv extends ProviderManagerEnv {
  [key: string]: unknown;
}

let metadataInitialized = false;

function ensureMetadataInitialized(env: FunctionEnv): void {
  if (metadataInitialized) return;
  metadataInitialized = true;

  preloadMetadata({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    summaries: aiSummaries as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authorContext: authorContextJson as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    voiceProfile: voiceProfile as any,
  });

  const authorCtx = getAuthorContext();
  const allSummaries = getAllSummaries();
  const summaryMap = new Map(allSummaries.map(s => [s.slug, s]));

  const siteUrl = (env.SITE_URL as string) || '';

  const articleDocs: SearchDocument[] = (authorCtx?.posts ?? []).map((post: AuthorPost) => {
    const summary = summaryMap.get(post.id);
    return {
      id: post.id,
      title: post.title,
      url: post.url || `${siteUrl}/${post.id}`,
      excerpt: post.summary || summary?.summary || '',
      content: [...(post.keyPoints ?? []), ...(summary?.keyPoints ?? [])].join(' '),
      categories: [post.category].filter(Boolean),
      tags: post.tags ?? [],
      keyPoints: [...(post.keyPoints ?? []), ...(summary?.keyPoints ?? [])],
      dateTime: post.date ? new Date(post.date).getTime() : 0,
      lang: post.lang,
      summary: summary?.summary,
    };
  });

  initArticleIndex(articleDocs);
  initProjectIndex([]);
}

export function createProviderManager(env: FunctionEnv): ProviderManager {
  ensureMetadataInitialized(env);

  return new ProviderManager(env, {
    enableMockFallback: true,
    unhealthyThreshold: 3,
    healthRecoveryTTL: 60000,
    onProviderSwitch: (from, to, reason) => {
      console.log(`[ProviderManager] Switch: ${from ?? 'none'} -> ${to} (${reason})`);
    },
    onStreamError: (providerId, error) => {
      console.error(`[ProviderManager] Stream error from ${providerId}:`, error.message);
    },
    onHealthChange: (providerId, healthy) => {
      console.log(`[ProviderManager] Health change: ${providerId} -> ${healthy ? 'healthy' : 'unhealthy'}`);
    },
  });
}

export function getAIConfigInfo(env: FunctionEnv): {
  bindingName: string;
  hasBinding: boolean;
  hasProvider: boolean;
  model: string;
  providerStatus?: ProviderStatus[];
} {
  ensureMetadataInitialized(env);
  
  const bindingName = (env.AI_BINDING_NAME as string) || 'souloss';
  const hasBinding = !!(env as Record<string, unknown>)[bindingName];
  
  const manager = createProviderManager(env);
  const providerStatus = manager.getProviderStatus();
  
  return {
    bindingName,
    hasBinding,
    hasProvider: hasAnyProviderConfigured(env),
    model: (env.AI_MODEL as string) || '@cf/zai-org/glm-4.7-flash',
    providerStatus,
  };
}

export type { FunctionEnv as Env };