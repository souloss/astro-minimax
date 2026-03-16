import type { CacheAdapter } from '../cache/types.js';
import type { CachedSearchContext, ArticleContext, ProjectContext } from './types.js';
import { MemoryCacheAdapter } from '../cache/memory-adapter.js';

export { type CachedSearchContext, type ArticleContext, type ProjectContext } from './types.js';

const SESSION_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{7,63}$/i;
export const SESSION_CACHE_TTL_SECONDS = 600;
export const SESSION_CACHE_TTL_MS = SESSION_CACHE_TTL_SECONDS * 1000;

let defaultCache: CacheAdapter | null = null;

function getDefaultCache(): CacheAdapter {
  if (!defaultCache) {
    defaultCache = new MemoryCacheAdapter({
      defaultTtl: SESSION_CACHE_TTL_SECONDS,
      maxEntries: 400,
    });
  }
  return defaultCache;
}

export function getSessionCacheKey(req: Request): string | null {
  const sessionId = req.headers.get('x-session-id')?.trim();
  if (sessionId && SESSION_ID_PATTERN.test(sessionId)) {
    return `sid:${sessionId}`;
  }
  return null;
}

export function setCacheAdapter(cache: CacheAdapter): void {
  defaultCache = cache;
}

export function getCacheAdapter(): CacheAdapter {
  return getDefaultCache();
}

export async function getCachedContext(
  key: string,
  cache?: CacheAdapter
): Promise<CachedSearchContext | undefined> {
  const adapter = cache ?? getDefaultCache();
  const entry = await adapter.get<CachedSearchContext>(key);
  return entry?.value;
}

export async function setCachedContext(
  key: string,
  ctx: CachedSearchContext,
  cache?: CacheAdapter
): Promise<void> {
  const adapter = cache ?? getDefaultCache();
  await adapter.set(key, ctx, { ttl: SESSION_CACHE_TTL_SECONDS });
}

export async function deleteCachedContext(
  key: string,
  cache?: CacheAdapter
): Promise<boolean> {
  const adapter = cache ?? getDefaultCache();
  return adapter.delete(key);
}

export function cleanupCache(_now: number): void {
  // No-op: MemoryCacheAdapter handles cleanup internally
  // KV adapter handles TTL automatically
}

// Legacy sync functions for backward compatibility (deprecated)
// These use internal Map for synchronous access
const legacyCache = new Map<string, CachedSearchContext>();
const LEGACY_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_SIZE = 400;

/** @deprecated Use getCachedContext instead */
export function getCachedContextSync(key: string): CachedSearchContext | undefined {
  const entry = legacyCache.get(key);
  if (!entry) return undefined;

  if (Date.now() - entry.updatedAt > LEGACY_TTL_MS) {
    legacyCache.delete(key);
    return undefined;
  }
  return entry;
}

/** @deprecated Use setCachedContext instead */
export function setCachedContextSync(key: string, ctx: CachedSearchContext): void {
  legacyCache.set(key, ctx);

  if (legacyCache.size > MAX_CACHE_SIZE) {
    const overflow = legacyCache.size - MAX_CACHE_SIZE;
    const keys = legacyCache.keys();
    for (let i = 0; i < overflow; i++) {
      const next = keys.next();
      if (next.done) break;
      legacyCache.delete(next.value);
    }
  }
}

/** @deprecated Use cleanupCache instead (no-op) */
export function cleanupCacheLegacy(now: number): void {
  for (const [key, value] of legacyCache) {
    if (now - value.updatedAt > LEGACY_TTL_MS) {
      legacyCache.delete(key);
    }
  }
  if (legacyCache.size > MAX_CACHE_SIZE) {
    const overflow = legacyCache.size - MAX_CACHE_SIZE;
    const keys = legacyCache.keys();
    for (let i = 0; i < overflow; i++) {
      const next = keys.next();
      if (next.done) break;
      legacyCache.delete(next.value);
    }
  }
}