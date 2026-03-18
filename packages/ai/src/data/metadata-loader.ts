import type { AISummariesFile, AuthorContextFile, VoiceProfile, LoadedMetadata, ArticleSummaryData } from './types.js';
import type { FactRegistryFile } from '../fact-registry/types.js';
import { loadFactRegistry as loadFactRegistryCache } from '../fact-registry/registry.js';
import { loadVectorIndex as loadVectorIndexCache } from '../search/vector-reranker.js';

// Lazy-loaded, memory-cached metadata
let cachedMetadata: LoadedMetadata | null = null;

/**
 * Pre-loads metadata synchronously from imported JSON objects.
 * Use this at function initialization time in edge environments.
 *
 * Example (in functions/lib/ai.ts):
 *   import summaries from '../../datas/ai-summaries.json' with { type: 'json' };
 *   preloadMetadata({ summaries, authorContext, voiceProfile, factRegistry });
 */
export function preloadMetadata(data: Partial<LoadedMetadata>): void {
  cachedMetadata = {
    summaries: data.summaries ?? null,
    authorContext: data.authorContext ?? null,
    voiceProfile: data.voiceProfile ?? null,
    factRegistry: data.factRegistry ?? null,
    vectorIndex: data.vectorIndex ?? null,
  };

  if (cachedMetadata.factRegistry) {
    loadFactRegistryCache(cachedMetadata.factRegistry);
  }

  if (cachedMetadata.vectorIndex) {
    loadVectorIndexCache(cachedMetadata.vectorIndex);
  }
}

/**
 * Clears the metadata cache and all associated sub-caches (useful for testing).
 */
export function clearMetadataCache(): void {
  cachedMetadata = null;
  loadFactRegistryCache(null);
  loadVectorIndexCache(null);
}

/**
 * Returns the cached metadata. Must call preloadMetadata() first.
 */
export function getMetadata(): LoadedMetadata {
  return cachedMetadata ?? { summaries: null, authorContext: null, voiceProfile: null, factRegistry: null, vectorIndex: null };
}

/**
 * Returns the AI-generated summary for an article by its slug.
 */
export function getArticleSummary(slug: string): ArticleSummaryData | undefined {
  return cachedMetadata?.summaries?.articles[slug]?.data;
}

/**
 * Returns all article summaries as a flat array.
 */
export function getAllSummaries(): Array<{ slug: string } & ArticleSummaryData> {
  const articles = cachedMetadata?.summaries?.articles ?? {};
  return Object.entries(articles).map(([slug, entry]) => ({ slug, ...entry.data }));
}

/**
 * Returns the author context (name, site URL, recent posts list).
 */
export function getAuthorContext(): AuthorContextFile | null {
  return cachedMetadata?.authorContext ?? null;
}

/**
 * Returns the author's voice/style profile.
 */
export function getVoiceProfile(): VoiceProfile | null {
  return cachedMetadata?.voiceProfile ?? null;
}
