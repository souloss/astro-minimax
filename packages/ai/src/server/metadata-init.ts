import {
  preloadMetadata,
  getAuthorContext,
  getAllSummaries,
  initArticleIndex,
  initProjectIndex,
} from '../index.js';
import type { AuthorPost } from '../data/types.js';
import type { SearchDocument } from '../search/types.js';
import type { MetadataConfig, ChatHandlerEnv } from './types.js';

let initialized = false;

/**
 * Initializes AI metadata: loads summaries, author context, voice profile,
 * and builds search indices. Safe to call multiple times (idempotent).
 */
export function initializeMetadata(config: MetadataConfig, env?: ChatHandlerEnv): void {
  if (initialized) return;
  initialized = true;

  preloadMetadata({
    summaries: config.summaries as Parameters<typeof preloadMetadata>[0]['summaries'],
    authorContext: config.authorContext as Parameters<typeof preloadMetadata>[0]['authorContext'],
    voiceProfile: config.voiceProfile as Parameters<typeof preloadMetadata>[0]['voiceProfile'],
    factRegistry: (config.factRegistry ?? null) as Parameters<typeof preloadMetadata>[0]['factRegistry'],
    vectorIndex: (config.vectorIndex ?? null) as Parameters<typeof preloadMetadata>[0]['vectorIndex'],
  });

  const authorCtx = getAuthorContext();
  const allSummaries = getAllSummaries();
  const summaryMap = new Map(allSummaries.map(s => [s.slug, s]));

  const siteUrl = config.siteUrl ?? (env?.SITE_URL as string | undefined) ?? '';

  const articleDocs: SearchDocument[] = (authorCtx?.posts ?? []).map((post: AuthorPost) => {
    const summary = summaryMap.get(post.id);
    const baseUrl = post.url?.startsWith('http') ? '' : siteUrl;
    return {
      id: post.id,
      title: post.title,
      url: post.url ? `${baseUrl}${post.url}` : `${siteUrl}/${post.id}`,
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

/**
 * Resets initialization state (for testing).
 */
export function resetMetadataInit(): void {
  initialized = false;
}
