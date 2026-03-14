import type { StreamTextOptions, StreamTextResult } from './types.js';
import { BaseProviderAdapter } from './base.js';
import { getMockResponse } from '../providers/mock.js';

const MOCK_WEIGHT = 0;

export class MockAdapter extends BaseProviderAdapter {
  readonly id = 'mock' as const;
  readonly type = 'mock' as const;
  readonly weight = MOCK_WEIGHT;
  readonly model = 'mock';
  readonly keywordModel = 'mock';
  readonly evidenceModel = 'mock';
  readonly timeout = 0;

  constructor() {
    super({ unhealthyThreshold: 999 });
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async streamText(options: StreamTextOptions): Promise<StreamTextResult> {
    const { userQuestion = '', lang = 'zh' } = options;
    const text = getMockResponse(userQuestion, lang);

    const encoder = new TextEncoder();
    const lines = [
      `0:"${text.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"\n`,
      `d:{"finishReason":"stop","usage":{"inputTokens":0,"outputTokens":0}}\n`,
    ];

    const stream = new ReadableStream({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(line));
        }
        controller.close();
      },
    });

    const response = new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
        'Access-Control-Allow-Origin': '*',
        'x-vercel-ai-data-stream': 'v1',
      },
    });

    return {
      toUIMessageStreamResponse: () => response,
      providerId: this.id,
      isMock: true,
    };
  }

  getProvider(): { chatModel: (model: string) => unknown } {
    throw new Error('Mock provider does not support chatModel interface');
  }
}