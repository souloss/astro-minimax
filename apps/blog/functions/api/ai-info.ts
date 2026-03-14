/// <reference types="@cloudflare/workers-types" />
import { createProviderManager, getAIConfigInfo, type FunctionEnv } from '../lib/ai';

export const onRequest: PagesFunction<FunctionEnv> = async (context) => {
  const info = getAIConfigInfo(context.env);
  const manager = createProviderManager(context.env);

  const safeConfig = {
    AI_BINDING_NAME: context.env.AI_BINDING_NAME || '(default: souloss)',
    AI_BASE_URL: context.env.AI_BASE_URL
      ? context.env.AI_BASE_URL.replace(/^(https?:\/\/)([^/]+).*/, '$1$2/...')
      : '(not set)',
    AI_API_KEY: context.env.AI_API_KEY ? '****(set)' : '(not set)',
    AI_MODEL: context.env.AI_MODEL || '(not set)',
    AI_PROVIDERS: context.env.AI_PROVIDERS ? '(configured)' : '(not set)',
  };

  const hints: string[] = [];

  if (!info.hasProvider && !info.hasBinding) {
    hints.push('No AI providers configured.');
    hints.push('Set AI_PROVIDERS JSON for multi-provider support.');
    hints.push('Or use legacy AI_BASE_URL + AI_API_KEY for OpenAI-compatible APIs.');
    hints.push('Or configure a Workers AI binding in wrangler.toml.');
  } else {
    hints.push(`Providers available: ${manager.getProviderCount()}`);
    if (info.providerStatus) {
      for (const status of info.providerStatus) {
        const health = status.health.healthy ? '✓' : '✗';
        hints.push(`  ${health} ${status.id} (${status.type}, weight: ${status.weight}, model: ${status.model})`);
      }
    }
    hints.push('Mock fallback: enabled');
  }

  return new Response(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ai: {
      configured: info.hasProvider || info.hasBinding,
      providers: info.providerStatus?.map(p => ({
        id: p.id,
        type: p.type,
        weight: p.weight,
        healthy: p.health.healthy,
        model: p.model,
      })) ?? [],
    },
    environment: safeConfig,
    hints,
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};