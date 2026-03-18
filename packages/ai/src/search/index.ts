export { initArticleIndex, initProjectIndex, searchArticles, searchProjects, mergeResults } from './search-api.js';
export { getIDFMapForIndex } from './search-index.js';
export { loadVectorIndex, clearVectorIndex, hasVectorIndex, rerankWithVectors } from './vector-reranker.js';
export type { VectorIndex, VectorChunk } from './vector-reranker.js';
export {
  getSessionCacheKey,
  getCachedContext,
  setCachedContext,
  deleteCachedContext,
  setCacheAdapter,
  getCacheAdapter,
  cleanupCache,
  SESSION_CACHE_TTL_SECONDS,
  SESSION_CACHE_TTL_MS,
  getCachedContextSync,
  setCachedContextSync,
  cleanupCacheLegacy,
} from './session-cache.js';
export { normalizeText, tokenize, scoreDocument } from './search-utils.js';
export { buildIDFMap, getIDFWeight } from './idf.js';
export type { IDFMap } from './idf.js';
export type { SearchDocument, ArticleContext, ProjectContext, CachedSearchContext, SearchResult } from './types.js';
