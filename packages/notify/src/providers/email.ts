import type { EmailConfig, EmailTemplate, SendResult, Logger } from '../types.js';

export interface EmailProvider {
  send(template: EmailTemplate): Promise<SendResult>;
}

let proxyConfigured = false;

async function configureProxy(): Promise<void> {
  if (proxyConfigured) return;
  
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
  
  if (proxyUrl) {
    try {
      const { setGlobalDispatcher, ProxyAgent } = await import('undici');
      setGlobalDispatcher(new ProxyAgent(proxyUrl));
      proxyConfigured = true;
    } catch {
      // ProxyAgent not available, continue without proxy
    }
  }
}

export function createEmailProvider(
  config: EmailConfig,
  logger?: Logger
): EmailProvider {
  const { provider, apiKey, from, to } = config;

  return {
    async send(template: EmailTemplate): Promise<SendResult> {
      const start = Date.now();
      
      if (provider !== 'resend') {
        return {
          channel: 'email',
          success: false,
          error: `Unsupported email provider: ${provider}`,
          duration: 0,
        };
      }

      try {
        await configureProxy();
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to,
            subject: template.subject,
            html: template.html,
            text: template.text,
          }),
        });

        const duration = Date.now() - start;

        if (!response.ok) {
          const errorData = await response.json() as { message?: string };
          const errorMsg = `Resend API error: ${response.status} - ${errorData.message || 'Unknown error'}`;
          
          logger?.error('Email send failed', new Error(errorMsg), {
            to,
            status: response.status,
          });
          
          return {
            channel: 'email',
            success: false,
            error: errorMsg,
            duration,
          };
        }

        logger?.info('Email notification sent', { to, duration });
        
        return {
          channel: 'email',
          success: true,
          duration,
        };
      } catch (error) {
        const duration = Date.now() - start;
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        logger?.error('Email send failed', error instanceof Error ? error : undefined, {
          to,
          error: errorMsg,
        });
        
        return {
          channel: 'email',
          success: false,
          error: errorMsg,
          duration,
        };
      }
    },
  };
}