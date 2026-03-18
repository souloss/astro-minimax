/// <reference types="@cloudflare/workers-types" />
import { handleChatRequest, initializeMetadata } from '@astro-minimax/ai/server';
import type { ChatHandlerEnv } from '@astro-minimax/ai/server';
import aiSummaries from '../../datas/ai-summaries.json';
import authorContext from '../../datas/author-context.json';
import voiceProfile from '../../datas/voice-profile.json';
import factRegistry from '../../datas/fact-registry.json';

interface FunctionEnv extends ChatHandlerEnv {
  CACHE_KV?: KVNamespace;
  minimaxAI?: Ai;
  [key: string]: unknown;
}

export const onRequest: PagesFunction<FunctionEnv> = async (context) => {
  initializeMetadata(
    { summaries: aiSummaries, authorContext, voiceProfile, factRegistry },
    context.env,
  );
  return handleChatRequest({ 
    env: context.env, 
    request: context.request,
  });
};