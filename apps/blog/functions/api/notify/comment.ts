/// <reference types="@cloudflare/workers-types" />
import { createNotifier } from '@astro-minimax/notify';

interface WalineComment {
  objectId?: string;
  url: string;
  nick: string;
  mail: string;
  link?: string;
  comment: string;
  ip?: string;
  ua?: string;
  insertedAt?: string;
  status?: string;
}

interface WalineWebhookPayload {
  type: 'new_comment' | 'new_reply';
  data: WalineComment;
}

interface FunctionEnv {
  NOTIFY_TELEGRAM_BOT_TOKEN?: string;
  NOTIFY_TELEGRAM_CHAT_ID?: string;
  NOTIFY_WEBHOOK_URL?: string;
  NOTIFY_RESEND_API_KEY?: string;
  NOTIFY_RESEND_FROM?: string;
  NOTIFY_RESEND_TO?: string;
  SITE_URL?: string;
  [key: string]: unknown;
}

export const onRequest: PagesFunction<FunctionEnv> = async (context) => {
  const { env, request } = context;

  try {
    if (!env.NOTIFY_TELEGRAM_BOT_TOKEN && !env.NOTIFY_WEBHOOK_URL && !env.NOTIFY_RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'No notification providers configured' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let payload: WalineWebhookPayload;
    try {
      payload = await request.json() as WalineWebhookPayload;
    } catch (parseError) {
      console.error('[notify/comment] Failed to parse JSON:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (payload.type !== 'new_comment' && payload.type !== 'new_reply') {
      return new Response(JSON.stringify({ error: 'Unsupported event type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data } = payload;
    const siteUrl = env.SITE_URL || 'https://your-blog.pages.dev';
    
    const urlPath = data?.url || '';
    const postUrl = urlPath.startsWith('http') 
      ? urlPath 
      : `${siteUrl}${urlPath}`;

    const notifier = createNotifier({
      telegram: env.NOTIFY_TELEGRAM_BOT_TOKEN && env.NOTIFY_TELEGRAM_CHAT_ID ? {
        botToken: env.NOTIFY_TELEGRAM_BOT_TOKEN,
        chatId: env.NOTIFY_TELEGRAM_CHAT_ID,
      } : undefined,
      webhook: env.NOTIFY_WEBHOOK_URL ? {
        url: env.NOTIFY_WEBHOOK_URL,
      } : undefined,
      email: env.NOTIFY_RESEND_API_KEY && env.NOTIFY_RESEND_FROM && env.NOTIFY_RESEND_TO ? {
        provider: 'resend',
        apiKey: env.NOTIFY_RESEND_API_KEY,
        from: env.NOTIFY_RESEND_FROM,
        to: env.NOTIFY_RESEND_TO,
      } : undefined,
    });

    console.log('[notify/comment] Sending notification for:', { urlPath, author: data?.nick });

    const result = await notifier.comment({
      author: data?.nick || '匿名用户',
      content: data?.comment || '',
      postTitle: extractPostTitle(urlPath),
      postUrl,
    });

    console.log('[notify/comment] Result:', { success: result.success, channels: result.results.length });

    return new Response(JSON.stringify({
      success: result.success,
      event: 'comment',
      channels: result.results.map(r => ({
        channel: r.channel,
        success: r.success,
      })),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[notify/comment] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

function extractPostTitle(url: string): string {
  if (!url || typeof url !== 'string') {
    return '博客文章';
  }
  
  // Match both /posts/xxx and /zh/posts/xxx patterns
  const match = url.match(/\/(?:[a-z]{2}\/)?posts\/([^/]+)/);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1].replace(/-/g, ' '));
    } catch {
      return match[1].replace(/-/g, ' ');
    }
  }
  return '博客文章';
}