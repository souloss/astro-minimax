/// <reference types="@cloudflare/workers-types" />
import { handleChatRequest, initializeMetadata } from '@astro-minimax/ai/server';
import type { ChatHandlerEnv } from '@astro-minimax/ai/server';
import aiSummaries from '../../datas/ai-summaries.json';
import authorContext from '../../datas/author-context.json';
import voiceProfile from '../../datas/voice-profile.json';
import factRegistry from '../../datas/fact-registry.json';

// Optional: TF-IDF vector index for enhanced search reranking
// The vector index is created by `astro-minimax ai process` command
// Lazy-loaded on first request to avoid top-level await issues with Cloudflare Pages
let vectorIndex: unknown = null;
let vectorIndexLoaded = false;

async function loadVectorIndex(): Promise<unknown> {
  if (vectorIndexLoaded) return vectorIndex;
  vectorIndexLoaded = true;
  try {
    // Dynamic import for optional file that may not exist
    const module = await import('../../src/data/vectors/index.json');
    vectorIndex = module.default;
  } catch {
    // File not available, keep vectorIndex as null
  }
  return vectorIndex;
}

interface FunctionEnv extends ChatHandlerEnv {
  CACHE_KV?: KVNamespace;
  minimaxAI?: Ai;
  [key: string]: unknown;
}

export const onRequest: PagesFunction<FunctionEnv> = async (context) => {
  await loadVectorIndex();
  
  initializeMetadata(
    { summaries: aiSummaries, authorContext, voiceProfile, factRegistry, vectorIndex },
    context.env,
  );
  return handleChatRequest({ 
    env: context.env, 
    request: context.request,
    waitUntil: context.waitUntil,
  });
};