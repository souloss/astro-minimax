import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText, convertToModelMessages } from 'ai';
import type { OpenAIProviderConfig, StreamTextOptions, StreamTextResult } from './types.js';
import { BaseProviderAdapter } from './base.js';

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

    this.provider = createOpenAICompatible({
      name: `openai-${config.id}`,
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      includeUsage: true,
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