/// <reference types="@cloudflare/workers-types" />
import { handleChatRequest, initializeMetadata } from '@astro-minimax/ai/server';
import type { ChatHandlerEnv } from '@astro-minimax/ai/server';
import aiSummaries from '../../apps/blog/datas/ai-summaries.json';
import authorContextJson from '../../apps/blog/datas/author-context.json';
import voiceProfile from '../../apps/blog/datas/voice-profile.json';

interface FunctionEnv extends ChatHandlerEnv {
  CACHE_KV: KVNamespace;
  minimaxAI: Ai;
  [key: string]: unknown;
}

export const onRequest: PagesFunction<FunctionEnv> = async (context) => {
  initializeMetadata(
    { summaries: aiSummaries, authorContext: authorContextJson, voiceProfile },
    context.env,
  );
  return handleChatRequest({ env: context.env, request: context.request });
};