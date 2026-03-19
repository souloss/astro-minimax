/// <reference types="@cloudflare/workers-types" />
import { handleChatRequest, initializeMetadata } from '@astro-minimax/ai/server';
import type { ChatHandlerEnv } from '@astro-minimax/ai/server';
import aiSummaries from '../../datas/ai-summaries.json';
import authorContext from '../../datas/author-context.json';
import voiceProfile from '../../datas/voice-profile.json';
import factRegistry from '../../datas/fact-registry.json';

// Optional: TF-IDF vector index for enhanced search reranking
// The vector index is created by `astro-minimax ai process` command
// Using dynamic import in try/catch since the file may not exist yet
let vectorIndex: unknown = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
try { vectorIndex = (await import('../../src/data/vectors/index.json' as any)).default; } catch { /* not available */ }

interface FunctionEnv extends ChatHandlerEnv {
  CACHE_KV?: KVNamespace;
  minimaxAI?: Ai;
  [key: string]: unknown;
}

export const onRequest: PagesFunction<FunctionEnv> = async (context) => {
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