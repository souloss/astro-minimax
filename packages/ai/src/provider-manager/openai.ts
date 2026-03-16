import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText, convertToModelMessages } from 'ai';
import { ProxyAgent, fetch as undiciFetch } from 'undici';
import type { OpenAIProviderConfig, StreamTextOptions, StreamTextResult } from './types.js';
import { BaseProviderAdapter } from './base.js';

function createProxyFetch(): ((url: string | URL, init?: RequestInit) => Promise<Response>) | undefined {
  const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY;
  if (!proxyUrl) return undefined;
  const agent = new ProxyAgent(proxyUrl);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((url: string | URL, init?: RequestInit) => undiciFetch(url, { ...init, dispatcher: agent } as any)) as any;
}

export class OpenAIAdapter extends BaseProviderAdapter {
  readonly id: string;
  readonly type = 'openai' as const;
  readonly weight: number;
  readonly model: string;
  readonly keywordModel: string;
  readonly evidenceModel: string;
  readonly timeout: number;

  private provider: ReturnType<typeof createOpenAICompatible>;
  private config: OpenAIProviderConfig;

  constructor(config: OpenAIProviderConfig) {
    super({
      unhealthyThreshold: config.maxRetries ? config.maxRetries + 2 : 3,
    });

    this.id = config.id;
    this.weight = config.weight ?? 100;
    this.model = config.model;
    this.keywordModel = config.keywordModel ?? config.model;
    this.evidenceModel = config.evidenceModel ?? this.keywordModel;
    this.timeout = config.timeout ?? 30000;
    this.config = config;

    const proxyFetch = createProxyFetch();
    this.provider = createOpenAICompatible({
      name: `openai-${config.id}`,
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      includeUsage: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(proxyFetch && { fetch: proxyFetch as any }),
    });
  }

  async streamText(options: StreamTextOptions): Promise<StreamTextResult> {
    const { system, messages, temperature = 0.7, maxOutputTokens, topP, abortSignal, onError } = options;

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.timeout);

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => abortController.abort());
    }

    try {
      const result = streamText({
        model: this.provider.chatModel(this.model),
        system,
        messages: await convertToModelMessages(messages),
        temperature,
        maxOutputTokens,
        topP,
        abortSignal: abortController.signal,
        onError: ({ error }) => {
          onError?.(error instanceof Error ? error : new Error(String(error)));
        },
      });

      const streamResult: StreamTextResult = {
        toUIMessageStreamResponse: (responseOptions?: { headers?: HeadersInit }) =>
          result.toUIMessageStreamResponse(responseOptions),
        providerId: this.id,
        isMock: false,
      };

      clearTimeout(timeoutId);
      return streamResult;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  getConfig(): OpenAIProviderConfig {
    return { ...this.config };
  }

  getProvider(): { chatModel: (model: string) => unknown } {
    return this.provider;
  }
}