/// <reference types="@cloudflare/workers-types" />

import { notifyAiChat } from '@astro-minimax/ai/server';

interface TestEnv {
  NOTIFY_TELEGRAM_BOT_TOKEN?: string;
  NOTIFY_TELEGRAM_CHAT_ID?: string;
  NOTIFY_WEBHOOK_URL?: string;
  NOTIFY_RESEND_API_KEY?: string;
  NOTIFY_RESEND_FROM?: string;
  NOTIFY_RESEND_TO?: string;
  SITE_URL?: string;
  [key: string]: unknown;
}

export const onRequest: PagesFunction<TestEnv> = async (context) => {
  const env = context.env;
  
  const result = await notifyAiChat({
    env,
    sessionId: `test-${Date.now()}`,
    messages: [
      { id: '1', role: 'user', parts: [{ type: 'text', text: '这是一条测试消息' }] }
    ],
    aiResponse: '这是一条测试 AI 回复',
    referencedArticles: [
      { title: '测试文章', url: '/posts/test' }
    ],
    model: {
      name: 'test-model',
      provider: 'test',
    },
    usage: {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    },
    timing: {
      total: 1000,
      keywordExtraction: 100,
      search: 200,
      evidenceAnalysis: 100,
      generation: 600,
    },
  });
  
  return new Response(JSON.stringify({
    success: !!result,
    result: result ? {
      event: result.event,
      success: result.success,
      channels: result.results.map(r => ({
        channel: r.channel,
        success: r.success,
        error: r.error,
      })),
    } : null,
    envCheck: {
      hasTelegram: !!env.NOTIFY_TELEGRAM_BOT_TOKEN,
      hasChatId: !!env.NOTIFY_TELEGRAM_CHAT_ID,
      hasResend: !!env.NOTIFY_RESEND_API_KEY,
    },
  }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};