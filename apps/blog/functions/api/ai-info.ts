/// <reference types="@cloudflare/workers-types" />
import { ProviderManager, hasAnyProviderConfigured } from '@astro-minimax/ai';
import { initializeMetadata } from '@astro-minimax/ai/server';
import type { ChatHandlerEnv } from '@astro-minimax/ai/server';
import aiSummaries from '../../datas/ai-summaries.json';
import authorContextJson from '../../datas/author-context.json';
import voiceProfile from '../../datas/voice-profile.json';

interface FunctionEnv extends ChatHandlerEnv {
  [key: string]: unknown;
}

export const onRequest: PagesFunction<FunctionEnv> = async (context) => {
  const env = context.env;
  initializeMetadata(
    { summaries: aiSummaries, authorContext: authorContextJson, voiceProfile },
    env,
  );

  const manager = new ProviderManager(env, { enableMockFallback: true });
  const providerStatus = manager.getProviderStatus();
  const bindingName = (env.AI_BINDING_NAME as string) || 'souloss';

  return new Response(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ai: {
      configured: hasAnyProviderConfigured(env) || !!(env as Record<string, unknown>)[bindingName],
      providers: providerStatus.map(p => ({
        id: p.id, type: p.type, weight: p.weight, healthy: p.health.healthy, model: p.model,
      })),
    },
    hints: manager.hasProviders()
      ? [`Providers available: ${manager.getProviderCount()}`, 'Mock fallback: enabled']
      : ['No AI providers configured. Set AI_BASE_URL + AI_API_KEY or configure Workers AI binding.'],
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
