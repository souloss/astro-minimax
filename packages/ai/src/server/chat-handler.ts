import {
  type UIMessage,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  convertToModelMessages,
} from 'ai';
import { t, getLang } from '../utils/i18n.js';
import {
  getClientIP,
  checkRateLimit,
  rateLimitResponse,
  searchArticles,
  searchProjects,
  getSessionCacheKey,
  getCachedContext,
  setCachedContext,
  cleanupCache,
  shouldReuseSearchContext,
  buildLocalSearchQuery,
  shouldRunKeywordExtraction,
  extractSearchKeywords,
  KEYWORD_EXTRACTION_TIMEOUT_MS,
  shouldSkipAnalysis,
  analyzeRetrievedEvidence,
  buildEvidenceSection,
  EVIDENCE_ANALYSIS_TIMEOUT_MS,
  getCitationGuardPreflight,
  buildSystemPrompt,
  getAuthorContext,
  getVoiceProfile,
  mergeResults,
  ProviderManager,
} from '../index.js';
import type { ChatHandlerOptions, ChatRequestBody, ChatContext } from './types.js';
import { createChatStatusData } from './types.js';
import { errors, corsPreflightResponse } from './errors.js';

const MAX_HISTORY_MESSAGES = 20;
const MAX_INPUT_LENGTH = 500;
const REQUEST_TIMEOUT_MS = 45_000;

// ── Message Helpers ───────────────────────────────────────────

function getMessageText(message: UIMessage): string {
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map(p => p.text)
      .join('');
  }
  return '';
}

function hasContent(message: UIMessage): boolean {
  const text = getMessageText(message);
  if (text.trim()) return true;
  if (Array.isArray(message.parts)) {
    return message.parts.some(p => p.type !== 'text');
  }
  return false;
}

function filterValidMessages(messages: UIMessage[]): UIMessage[] {
  const filtered: UIMessage[] = [];
  let lastRole: string | null = null;

  for (const msg of messages) {
    if (!hasContent(msg)) continue;
    if (msg.role === lastRole) continue;
    filtered.push(msg);
    lastRole = msg.role;
  }

  if (filtered.length > 0 && filtered[filtered.length - 1].role !== 'user') {
    filtered.pop();
  }

  return filtered;
}

// ── Article Context Prompt Enhancement ────────────────────────

function buildArticleContextPrompt(context: ChatContext): string {
  if (context.scope !== 'article' || !context.article) return '';

  const a = context.article;
  const parts: string[] = [
    '\n[当前阅读文章]',
    `用户正在阅读：《${a.title}》`,
  ];

  if (a.summary) parts.push(`摘要：${a.summary}`);
  if (a.abstract) parts.push(`详细概要：${a.abstract}`);
  if (a.keyPoints?.length) parts.push(`核心要点：${a.keyPoints.join('；')}`);
  if (a.categories?.length) parts.push(`分类：${a.categories.join('、')}`);

  parts.push(
    '',
    '你正在陪用户阅读这篇文章。优先围绕这篇文章的内容回答问题。',
    '当用户的问题与当前文章相关时，引用文章中的具体内容。',
    '当用户想要延伸时，推荐相关的博客文章。',
  );

  return parts.join('\n');
}

// ── Main Handler ──────────────────────────────────────────────

export async function handleChatRequest(options: ChatHandlerOptions): Promise<Response> {
  const { env, request: req } = options;
  const lang = getLang(env.SITE_LANG as string | undefined);

  if (req.method === 'OPTIONS') return corsPreflightResponse();
  if (req.method !== 'POST') return errors.methodNotAllowed(lang);

  const ip = getClientIP(req);
  const rateCheck = checkRateLimit(ip, env as Record<string, string | undefined>);
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck, lang);

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return errors.invalidRequest(t('ai.error.format', lang));
  }

  const context: ChatContext = body.context ?? { scope: 'global' };
  const rawMessages = (body.messages ?? []).slice(-MAX_HISTORY_MESSAGES);
  if (!rawMessages.length) return errors.emptyMessage(lang);

  const messages = filterValidMessages(rawMessages);
  if (!messages.length) return errors.emptyMessage(lang);

  const latestMessage = messages[messages.length - 1];
  const latestText = getMessageText(latestMessage);
  if (!latestText) return errors.emptyContent(lang);
  if (latestText.length > MAX_INPUT_LENGTH) return errors.inputTooLong(MAX_INPUT_LENGTH, lang);

  const requestAbort = new AbortController();
  const requestTimer = setTimeout(() => requestAbort.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await runPipeline({ env, messages, latestText, context, req, requestAbort });
  } catch (err) {
    if (requestAbort.signal.aborted) return errors.timeout(lang);
    console.error('[chat-handler] Unexpected error:', err);
    return errors.internal(undefined, lang);
  } finally {
    clearTimeout(requestTimer);
  }
}

// ── RAG Pipeline ──────────────────────────────────────────────

interface PipelineArgs {
  env: ChatHandlerOptions['env'];
  messages: UIMessage[];
  latestText: string;
  context: ChatContext;
  req: Request;
  requestAbort: AbortController;
}

async function runPipeline(args: PipelineArgs): Promise<Response> {
  const { env, messages, latestText, context, req } = args;

  const manager = new ProviderManager(env, {
    enableMockFallback: true,
    unhealthyThreshold: 3,
    healthRecoveryTTL: 60_000,
  });

  const hasRealProvider = manager.hasProviders();
  const adapter = hasRealProvider ? await manager.getAvailableAdapter() : null;

  // ── Search / Retrieval ──────────────────────────────────────

  const cacheKey = getSessionCacheKey(req);
  const now = Date.now();
  cleanupCache(now);

  const cachedContext = cacheKey ? getCachedContext(cacheKey) : undefined;
  const userTurnCount = messages.filter((m: UIMessage) => m.role === 'user').length;
  const reuseContext = shouldReuseSearchContext({ latestText, cachedContext, userTurnCount, now });

  let searchQuery = buildLocalSearchQuery(latestText) || latestText;
  let relatedArticles = reuseContext && cachedContext ? cachedContext.articles : [];
  let relatedProjects = reuseContext && cachedContext ? cachedContext.projects : [];

  if (reuseContext && cachedContext && cacheKey) {
    searchQuery = cachedContext.query;
    setCachedContext(cacheKey, { ...cachedContext, updatedAt: now });
  } else {
    if (hasRealProvider && adapter) {
      const runKW = shouldRunKeywordExtraction({
        messageCount: messages.length,
        localQuery: searchQuery,
        latestText,
      });

      if (runKW) {
        const abortCtrl = new AbortController();
        const timeoutId = setTimeout(() => abortCtrl.abort(), KEYWORD_EXTRACTION_TIMEOUT_MS);
        try {
          const provider = adapter.getProvider();
          const kwResult = await extractSearchKeywords({
            messages: messages as Array<{ role: string; parts?: Array<{ type: string; text?: string }> }>,
            provider,
            model: adapter.keywordModel,
            abortSignal: abortCtrl.signal,
          });
          if (kwResult.query && !kwResult.usedFallback) {
            searchQuery = kwResult.query;
            if (kwResult.primaryQuery && kwResult.primaryQuery !== searchQuery) {
              const primary = searchArticles(kwResult.primaryQuery, { enableDeepContent: false });
              relatedArticles = mergeResults(
                searchArticles(searchQuery, { enableDeepContent: true }),
                primary,
              );
              relatedProjects = searchProjects(searchQuery);
            }
          }
        } catch {
          // keyword extraction is optional
        } finally {
          clearTimeout(timeoutId);
        }
      }
    }

    if (!relatedArticles.length) {
      relatedArticles = searchArticles(searchQuery, { enableDeepContent: true });
      relatedProjects = searchProjects(searchQuery);
    }

    if (cacheKey) {
      setCachedContext(cacheKey, {
        query: searchQuery,
        articles: relatedArticles,
        projects: relatedProjects,
        updatedAt: now,
      });
    }
  }

  // ── Evidence Analysis (optional) ────────────────────────────

  let evidenceSection = '';

  if (hasRealProvider && adapter) {
    const skipEvidence = shouldSkipAnalysis(latestText, relatedArticles.length, 'moderate');

    if (!skipEvidence) {
      const abortCtrl = new AbortController();
      const timeoutId = setTimeout(() => abortCtrl.abort(), EVIDENCE_ANALYSIS_TIMEOUT_MS);
      try {
        const provider = adapter.getProvider();
        const evidenceResult = await analyzeRetrievedEvidence({
          userQuery: latestText,
          articles: relatedArticles,
          projects: relatedProjects,
          provider,
          model: adapter.evidenceModel,
          abortSignal: abortCtrl.signal,
        });
        if (evidenceResult.analysis) {
          evidenceSection = buildEvidenceSection(evidenceResult.analysis);
        }
      } catch {
        // evidence analysis is optional
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  // ── Citation Guard ──────────────────────────────────────────

  const preflight = getCitationGuardPreflight({
    userQuery: latestText,
    articles: relatedArticles,
    projects: relatedProjects,
  });

  // ── Build System Prompt ─────────────────────────────────────

  const articlePrompt = buildArticleContextPrompt(context);
  const systemPrompt = buildSystemPrompt({
    static: {
      authorName: (env.SITE_AUTHOR as string) || '博主',
      siteUrl: (env.SITE_URL as string) || '',
    },
    semiStatic: {
      authorContext: getAuthorContext(),
      voiceProfile: getVoiceProfile(),
    },
    dynamic: {
      userQuery: searchQuery,
      articles: relatedArticles,
      projects: relatedProjects,
      evidenceSection: articlePrompt
        ? `${evidenceSection}\n${articlePrompt}`
        : evidenceSection,
    },
  });

  // ── Stream Response via createUIMessageStream ───────────────

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const articleCount = relatedArticles.length + relatedProjects.length;

      // Push status: search results
      if (articleCount > 0) {
        writer.write({
          type: 'message-metadata',
          messageMetadata: createChatStatusData({
            stage: 'search',
            message: t('ai.status.found', lang, { count: articleCount }),
            progress: 40,
          }),
        });
      }

      // Push source parts for top related articles
      for (const article of relatedArticles.slice(0, 3)) {
        try {
          writer.write({
            type: 'source',
            value: {
              type: 'source',
              sourceType: 'url',
              id: `source-${article.title}`,
              url: (article as { url?: string }).url ?? '#',
              title: article.title,
            },
          } as never);
        } catch {
          // source writing is best-effort
        }
      }

      // Citation guard preflight: return canned response without calling LLM
      if (preflight) {
        writer.write({
          type: 'message-metadata',
          messageMetadata: createChatStatusData({
            stage: 'answer',
            message: t('ai.status.citation', lang),
            progress: 100,
            done: true,
          }),
        });
        const partId = `preflight-${Date.now()}`;
        writer.write({ type: 'text-start' as never, id: partId } as never);
        writer.write({ type: 'text-delta' as never, id: partId, delta: preflight.text } as never);
        writer.write({ type: 'text-end' as never, id: partId } as never);
        writer.write({ type: 'finish', finishReason: 'stop' });
        return;
      }

      // Push status: generating
      writer.write({
        type: 'message-metadata',
        messageMetadata: createChatStatusData({
          stage: 'answer',
          message: t('ai.status.generating', lang),
          progress: 60,
        }),
      });

      // Try real provider with stream-level error detection
      let streamSuccess = false;
      if (adapter) {
        try {
          const provider = adapter.getProvider();
          const result = streamText({
            model: (provider as { chatModel: (m: string) => never }).chatModel(adapter.model),
            system: systemPrompt,
            messages: await convertToModelMessages(messages),
            temperature: 0.3,
            maxOutputTokens: 2500,
            onError: ({ error }) => {
              console.error('[chat-handler] streamText error:', error);
            },
          });

          let hasTextOutput = false;
          const errors: Error[] = [];

          writer.merge(result.toUIMessageStream({ sendFinish: false }));
          await result.consumeStream({
            onError: (error) => {
              errors.push(error instanceof Error ? error : new Error(String(error)));
            },
          });

          const text = await result.text;
          hasTextOutput = text.length > 0;

          if (hasTextOutput && errors.length === 0) {
            adapter.recordSuccess();
            writer.write({ type: 'finish', finishReason: 'stop' });
            streamSuccess = true;
          } else if (errors.length > 0) {
            adapter.recordFailure(errors[0]);
            console.error('[chat-handler] Stream error:', errors[0].message);
          }
        } catch (err) {
          adapter.recordFailure(err instanceof Error ? err : new Error(String(err)));
          console.error('[chat-handler] Provider threw:', (err as Error).message);
        }
      }

      // Fallback to mock if real provider didn't produce output
      if (!streamSuccess) {
        const { getMockResponse } = await import('../providers/mock.js');
        const mockText = getMockResponse(latestText, lang);
        writer.write({
          type: 'message-metadata',
          messageMetadata: createChatStatusData({
            stage: 'answer',
            message: t('ai.status.fallback', lang),
            progress: 80,
          }),
        });
        writer.write({ type: 'text-delta', textDelta: mockText } as never);
        writer.write({ type: 'finish', finishReason: 'stop' });
      }
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
}
