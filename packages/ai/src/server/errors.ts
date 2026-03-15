import type { ChatErrorResponse } from './types.js';

const CORS_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export function chatError(
  code: string,
  error: string,
  status: number,
  options?: { retryable?: boolean; retryAfter?: number },
): Response {
  const body: ChatErrorResponse = {
    error,
    code,
    retryable: options?.retryable ?? false,
    retryAfter: options?.retryAfter,
  };
  const headers: HeadersInit = { ...CORS_HEADERS };
  if (options?.retryAfter) {
    (headers as Record<string, string>)['Retry-After'] = String(options.retryAfter);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export const errors = {
  methodNotAllowed: () =>
    chatError('METHOD_NOT_ALLOWED', 'Method not allowed', 405),
  invalidRequest: (detail?: string) =>
    chatError('INVALID_REQUEST', detail ?? '请求格式有误', 400),
  emptyMessage: () =>
    chatError('INVALID_REQUEST', '消息不能为空', 400),
  emptyContent: () =>
    chatError('INVALID_REQUEST', '消息内容不能为空', 400),
  inputTooLong: (max: number) =>
    chatError('INPUT_TOO_LONG', `消息过长，最多 ${max} 字`, 400),
  rateLimited: (retryAfter?: number) =>
    chatError('RATE_LIMITED', '请求太频繁，请稍后再试', 429, { retryable: true, retryAfter: retryAfter ?? 10 }),
  timeout: () =>
    chatError('TIMEOUT', '响应超时，请重试或简化问题', 504, { retryable: true }),
  providerUnavailable: () =>
    chatError('PROVIDER_UNAVAILABLE', 'AI 服务暂时不可用，请稍后再试', 503, { retryable: true, retryAfter: 30 }),
  internal: (detail?: string) =>
    chatError('INTERNAL_ERROR', detail ?? '服务异常，请稍后再试', 500, { retryable: true, retryAfter: 5 }),
};

export function corsPreflightResponse(): Response {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-session-id',
    },
  });
}
