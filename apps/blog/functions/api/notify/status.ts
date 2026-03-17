/// <reference types="@cloudflare/workers-types" />

interface NotifyStatusEnv {
  NOTIFY_TELEGRAM_BOT_TOKEN?: string;
  NOTIFY_TELEGRAM_CHAT_ID?: string;
  NOTIFY_WEBHOOK_URL?: string;
  NOTIFY_RESEND_API_KEY?: string;
  NOTIFY_RESEND_FROM?: string;
  NOTIFY_RESEND_TO?: string;
  SITE_URL?: string;
  [key: string]: unknown;
}

interface ProviderStatus {
  configured: boolean;
  missingFields?: string[];
}

interface NotifyStatusResponse {
  timestamp: string;
  environment: 'production' | 'preview' | 'unknown';
  providers: {
    telegram: ProviderStatus;
    email: ProviderStatus;
    webhook: ProviderStatus;
  };
  siteUrl: {
    configured: boolean;
    value?: string;
  };
  summary: {
    totalProviders: number;
    configuredProviders: number;
    hasAnyProvider: boolean;
  };
}

export const onRequest: PagesFunction<NotifyStatusEnv> = async (context) => {
  const env = context.env;
  
  const telegramMissing = [
    !env.NOTIFY_TELEGRAM_BOT_TOKEN && 'NOTIFY_TELEGRAM_BOT_TOKEN',
    !env.NOTIFY_TELEGRAM_CHAT_ID && 'NOTIFY_TELEGRAM_CHAT_ID',
  ].filter(Boolean) as string[];
  
  const emailMissing = [
    !env.NOTIFY_RESEND_API_KEY && 'NOTIFY_RESEND_API_KEY',
    !env.NOTIFY_RESEND_FROM && 'NOTIFY_RESEND_FROM',
    !env.NOTIFY_RESEND_TO && 'NOTIFY_RESEND_TO',
  ].filter(Boolean) as string[];
  
  const webhookMissing = [
    !env.NOTIFY_WEBHOOK_URL && 'NOTIFY_WEBHOOK_URL',
  ].filter(Boolean) as string[];
  
  const environment = context.request.headers.get('x-cf-env') || 'unknown';
  
  const providers = {
    telegram: {
      configured: telegramMissing.length === 0,
      missingFields: telegramMissing.length > 0 ? telegramMissing : undefined,
    },
    email: {
      configured: emailMissing.length === 0,
      missingFields: emailMissing.length > 0 ? emailMissing : undefined,
    },
    webhook: {
      configured: webhookMissing.length === 0,
      missingFields: webhookMissing.length > 0 ? webhookMissing : undefined,
    },
  };
  
  const configuredProviders = Object.values(providers).filter(p => p.configured).length;
  
  const response: NotifyStatusResponse = {
    timestamp: new Date().toISOString(),
    environment: environment as 'production' | 'preview' | 'unknown',
    providers,
    siteUrl: {
      configured: !!env.SITE_URL,
      value: env.SITE_URL ? '[CONFIGURED]' : undefined,
    },
    summary: {
      totalProviders: 3,
      configuredProviders,
      hasAnyProvider: configuredProviders > 0,
    },
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
};