/// <reference types="@cloudflare/workers-types" />
import { getNotifier } from '@astro-minimax/notify';

interface WalineComment {
  objectId?: string | number;
  url?: string;
  nick?: string;
  mail?: string;
  link?: string;
  comment?: string;
  rawComment?: string;
  ip?: string;
  ua?: string;
  insertedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  type?: string;
  user_id?: number;
  rid?: string | number;
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
      console.warn('[notify/comment] No providers configured');
      return jsonError('No notification providers configured', 400);
    }

    let rawData: unknown;
    try {
      rawData = await request.json();
    } catch (parseError) {
      console.error('[notify/comment] Failed to parse JSON:', parseError);
      return jsonError('Invalid JSON payload', 400);
    }

    console.log('[notify/comment] Raw payload:', JSON.stringify(rawData).slice(0, 500));

    const { commentData, eventType } = parseWalinePayload(rawData);
    
    if (!commentData) {
      console.error('[notify/comment] Could not extract comment data from payload');
      return jsonError('Invalid payload structure', 400);
    }

    const siteUrl = env.SITE_URL || 'https://your-blog.pages.dev';
    const urlPath = getStringValue(commentData.url) || '';
    const postUrl = urlPath.startsWith('http') 
      ? urlPath 
      : `${siteUrl}${urlPath}`;

    const author = getStringValue(commentData.nick) || '匿名用户';
    const content = getStringValue(commentData.rawComment) || getStringValue(commentData.comment) || '';
    const postTitle = extractPostTitle(urlPath);

    console.log('[notify/comment] Processing:', { urlPath, author, postTitle });

    const notifier = getNotifier({
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

    const result = await notifier.comment({
      author,
      content,
      postTitle,
      postUrl,
    });

    console.log('[notify/comment] Result:', { success: result.success, channels: result.results.length });

    return new Response(JSON.stringify({
      success: result.success,
      event: eventType,
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
    return jsonError(
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
};

function parseWalinePayload(raw: unknown): { commentData: WalineComment | null; eventType: string } {
  if (!raw || typeof raw !== 'object') {
    return { commentData: null, eventType: 'unknown' };
  }

  const data = raw as Record<string, unknown>;

  // Waline format: { type: 'new_comment', data: { comment: {...} } }
  if (data.type === 'new_comment' || data.type === 'new_reply') {
    const dataObj = data.data as Record<string, unknown> | undefined;
    // Check if data contains a 'comment' field (Waline's nested structure)
    if (dataObj && dataObj.comment && typeof dataObj.comment === 'object') {
      return { 
        commentData: dataObj.comment as WalineComment, 
        eventType: data.type as string 
      };
    }
    // Fallback: data is the comment object directly
    return { 
      commentData: dataObj as WalineComment, 
      eventType: data.type as string 
    };
  }

  // Direct comment object format
  if (data.url || data.nick || data.comment || data.mail) {
    const type = data.rid ? 'new_reply' : 'new_comment';
    return { 
      commentData: data as WalineComment, 
      eventType: type 
    };
  }

  return { commentData: null, eventType: 'unknown' };
}

function getStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return String(value);
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function extractPostTitle(url: string): string {
  if (!url || typeof url !== 'string') {
    return '博客文章';
  }
  
  // Match /posts/xxx, /zh/posts/xxx, or /post/xxx formats
  const match = url.match(/\/(?:[a-z]{2}\/)?posts?\/([^/]+)/);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1].replace(/-/g, ' '));
    } catch {
      return match[1].replace(/-/g, ' ');
    }
  }
  return '博客文章';
}