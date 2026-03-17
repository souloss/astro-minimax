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
  getProviderManager,
  createCacheAdapter,
  detectPublicQuestion,
  getGlobalSearchCache,
  setGlobalSearchCache,
  getGlobalCacheTTL,
  getResponseCache,
  setResponseCache,
  getResponseCacheConfig,
  createResponsePlaybackGenerator,
  rankArticlesByIntent,
} from '../index.js';
import type { CacheAdapter, CachedSearchContext, PublicQuestionType, CachedAIResponse, ResponseCacheConfig, PlaybackChunk } from '../index.js';
import type { ChatHandlerOptions, ChatRequestBody, ChatContext } from './types.js';
import { createChatStatusData } from './types.js';
import { errors, corsPreflightResponse } from './errors.js';
import { notifyAiChat, type ChatNotifyOptions } from './notify.js';
import type { ArticleRef, ModelInfo, TokenUsage, PhaseTiming } from '@astro-minimax/notify';

const MAX_HISTORY_MESSAGES = 20;
const MAX_INPUT_LENGTH = 500;
const REQUEST_TIMEOUT_MS = 45_000;

function sendNotification(args: {
  env: ChatHandlerOptions['env'];
  messages: UIMessage[];
  responseText: string;
  relatedArticles: Array<{ title: string; url?: string }>;
  model?: ModelInfo;
  usage?: TokenUsage;
  timing: PhaseTiming;
  cacheKey?: string | null;
  waitUntil?: (promise: Promise<unknown>) => void;
}): void {
  const { env, messages, responseText, relatedArticles, model, usage, timing, cacheKey, waitUntil } = args;
  
  const sessionId = cacheKey || `dev-${Date.now().toString(36)}`;
  const notifyArticles: ArticleRef[] = relatedArticles.slice(0, 5).map(a => ({
    title: a.title,
    url: a.url,
  }));
  
  const notifyPromise = notifyAiChat({
    env,
    sessionId,
    messages,
    aiResponse: responseText,
    referencedArticles: notifyArticles,
    model,
    usage,
    timing,
  });
  
  if (waitUntil) {
    waitUntil(notifyPromise);
  } else {
    void notifyPromise;
  }
}

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
  const { env, request: req, waitUntil } = options;

  if (req.method === 'OPTIONS') return corsPreflightResponse();
  if (req.method !== 'POST') return errors.methodNotAllowed('zh');

  const ip = getClientIP(req);
  const rateCheck = checkRateLimit(ip, env as Record<string, string | undefined>);
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck, 'zh');

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return errors.invalidRequest(t('ai.error.format', 'zh'));
  }

  const lang = getLang(body.lang ?? (env.SITE_LANG as string | undefined));
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
    return await runPipeline({ env, messages, latestText, context, req, requestAbort, lang, waitUntil });
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
  lang: string;
  waitUntil?: (promise: Promise<unknown>) => void;
}

interface TimingTracker {
  start: number;
  keywordExtraction?: number;
  search?: number;
  evidenceAnalysis?: number;
  generation?: number;
}

async function runPipeline(args: PipelineArgs): Promise<Response> {
  const { env, messages, latestText, context, req, lang, waitUntil } = args;
  const timing: TimingTracker = { start: Date.now() };

  const cache = createCacheAdapter(env);
  const responseCacheConfig = getResponseCacheConfig(env);

  const manager = getProviderManager(env, {
    enableMockFallback: true,
    unhealthyThreshold: 3,
    healthRecoveryTTL: 60_000,
  });

  const hasRealProvider = manager.hasProviders();
  const adapter = hasRealProvider ? await manager.getAvailableAdapter() : null;

  // ── Global Cache Check for Public Questions ─────────────────────────

  const articleSlug = context.scope === 'article' && context.article?.slug 
    ? context.article.slug 
    : undefined;

  const publicQuestion = detectPublicQuestion(latestText);
  let globalCacheHit = false;
  let globalCacheType: PublicQuestionType | undefined;

  if (publicQuestion && (!publicQuestion.needsContext || articleSlug)) {
    const globalCacheContext = { articleSlug, lang };

    // Check response cache first if enabled
    if (responseCacheConfig.enabled) {
      const cachedResponse = await getResponseCache(cache, publicQuestion.type, globalCacheContext);
      
      if (cachedResponse) {
        globalCacheHit = true;
        globalCacheType = publicQuestion.type;

        const notifyTiming: PhaseTiming = { total: Date.now() - timing.start };
        
        sendNotification({
          env,
          messages,
          responseText: cachedResponse.response,
          relatedArticles: cachedResponse.articles,
          timing: notifyTiming,
          waitUntil,
        });

        const stream = createUIMessageStream({
          execute: async ({ writer }) => {
            writer.write({
              type: 'message-metadata',
              messageMetadata: createChatStatusData({
                stage: 'search',
                message: t('ai.status.found', lang, { count: cachedResponse.articles.length + cachedResponse.projects.length }),
                progress: 40,
              }),
            });

            writer.write({
              type: 'message-metadata',
              messageMetadata: createChatStatusData({
                stage: 'answer',
                message: t('ai.status.generating', lang),
                progress: 60,
              }),
            });

            for (const article of cachedResponse.articles.slice(0, 3)) {
              try {
                writer.write({
                  type: 'source-url',
                  sourceId: `source-${article.title}`,
                  url: (article as { url?: string }).url ?? '#',
                  title: article.title,
                } as never);
              } catch { /* best-effort */ }
            }

            writer.write({
              type: 'message-metadata',
              messageMetadata: createChatStatusData({
                stage: 'answer',
                message: t('ai.status.generating', lang),
                progress: 70,
              }),
            });

            const playbackGenerator = createResponsePlaybackGenerator(
              cachedResponse,
              responseCacheConfig
            );

            let hasThinking = !!cachedResponse.thinking;
            let thinkingId: string | undefined;
            const textId = `text-${Date.now()}`;
            let textStarted = false;

            for await (const chunk of playbackGenerator) {
              if (chunk.type === 'thinking') {
                if (!thinkingId) {
                  thinkingId = `thinking-${Date.now()}`;
                  writer.write({ type: 'reasoning-start', id: thinkingId } as never);
                }
                writer.write({ type: 'reasoning-delta', id: thinkingId, delta: chunk.text } as never);
              } else {
                if (thinkingId) {
                  writer.write({ type: 'reasoning-end', id: thinkingId } as never);
                  thinkingId = undefined;
                }
                if (!textStarted) {
                  writer.write({ type: 'text-start', id: textId } as never);
                  textStarted = true;
                }
                writer.write({ type: 'text-delta', id: textId, delta: chunk.text } as never);
              }
            }

            if (thinkingId) {
              writer.write({ type: 'reasoning-end', id: thinkingId } as never);
            }

            if (textStarted) {
              writer.write({ type: 'text-end', id: textId } as never);
            }

            writer.write({
              type: 'message-metadata',
              messageMetadata: createChatStatusData({
                stage: 'answer',
                message: t('ai.status.generating', lang),
                progress: 100,
                done: true,
              }),
            });

            writer.write({ type: 'finish', finishReason: 'stop' });
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
    }

    // Check search context cache
    const cachedSearch = await getGlobalSearchCache(cache, publicQuestion.type, globalCacheContext);

    if (cachedSearch) {
      globalCacheHit = true;
      globalCacheType = publicQuestion.type;

      const stream = createUIMessageStream({
        execute: async ({ writer }) => {
          writer.write({
            type: 'message-metadata',
            messageMetadata: createChatStatusData({
              stage: 'search',
              message: t('ai.status.found', lang, { count: cachedSearch.articles.length + cachedSearch.projects.length }),
              progress: 40,
            }),
          });

          const articleCount = cachedSearch.articles.length + cachedSearch.projects.length;
          if (articleCount > 0) {
            writer.write({
              type: 'message-metadata',
              messageMetadata: createChatStatusData({
                stage: 'answer',
                message: t('ai.status.generating', lang),
                progress: 60,
              }),
            });
          }

          for (const article of cachedSearch.articles.slice(0, 3)) {
            try {
writer.write({
                  type: 'source-url',
                  sourceId: `source-${article.title}`,
                  url: (article as { url?: string }).url ?? '#',
                  title: article.title,
                } as never);
            } catch { /* best-effort */ }
          }

          let responseText = '';

          if (adapter) {
            try {
              const provider = adapter.getProvider();
              const articlePrompt = buildArticleContextPrompt(context);
              const systemPrompt = buildSystemPrompt({
                static: {
                  authorName: (env.SITE_AUTHOR as string) || '博主',
                  siteUrl: (env.SITE_URL as string) || '',
                  lang,
                },
                semiStatic: {
                  authorContext: getAuthorContext(),
                  voiceProfile: getVoiceProfile(),
                },
                dynamic: {
                  userQuery: cachedSearch.query,
                  articles: cachedSearch.articles,
                  projects: cachedSearch.projects,
                  evidenceSection: articlePrompt,
                },
              });

              const result = streamText({
                model: (provider as { chatModel: (m: string) => never }).chatModel(adapter.model),
                system: systemPrompt,
                messages: await convertToModelMessages(messages),
                temperature: 0.3,
                maxOutputTokens: 2500,
              });

              const streamErrors: Error[] = [];
              writer.merge(result.toUIMessageStream({ sendFinish: false }));
              await result.consumeStream({
                onError: (error) => {
                  streamErrors.push(error instanceof Error ? error : new Error(String(error)));
                },
              });
              const text = await result.text;
              const reasoningPromise = (result as unknown as { reasoning?: PromiseLike<unknown> }).reasoning;
              let reasoningText: string | undefined;
              if (reasoningPromise) {
                try {
                  const reasoningOutput = await Promise.resolve(reasoningPromise);
                  reasoningText = typeof reasoningOutput === 'string' ? reasoningOutput : 
                    (Array.isArray(reasoningOutput) ? reasoningOutput.map((r): string => {
                      if (typeof r === 'object' && r !== null && 'text' in r) return (r as { text: string }).text;
                      return String(r);
                    }).join('') : undefined);
                } catch { /* reasoning is optional */ }
              }
              responseText = text;
              
              if (streamErrors.length > 0) {
                adapter.recordFailure(streamErrors[0]);
                const errorId = `error-${Date.now()}`;
                writer.write({ type: 'text-start', id: errorId } as never);
                writer.write({ 
                  type: 'text-delta', 
                  id: errorId, 
                  delta: t('ai.error.generic', lang) 
                } as never);
                writer.write({ type: 'text-end', id: errorId } as never);
                writer.write({ type: 'finish', finishReason: 'error' });
              } else if (text.length > 0) {
                adapter.recordSuccess();
                writer.write({ type: 'finish', finishReason: 'stop' });
              } else {
                const noOutputId = `no-output-${Date.now()}`;
                writer.write({ type: 'text-start', id: noOutputId } as never);
                writer.write({ type: 'text-delta', id: noOutputId, delta: t('ai.error.noOutput', lang) } as never);
                writer.write({ type: 'text-end', id: noOutputId } as never);
                writer.write({ type: 'finish', finishReason: 'stop' });
              }

              // Save to response cache if enabled
              if (responseCacheConfig.enabled && text.length > 0 && streamErrors.length === 0) {
                const globalTTL = getGlobalCacheTTL(publicQuestion.type);
                const responseCacheData: CachedAIResponse = {
                  query: cachedSearch.query,
                  thinking: reasoningText,
                  response: text,
                  articles: cachedSearch.articles,
                  projects: cachedSearch.projects,
                  lang,
                  model: adapter.model,
                  updatedAt: Date.now(),
                };
                await setResponseCache(cache, publicQuestion.type, responseCacheData, globalTTL, globalCacheContext);
              }
            } catch (err) {
                console.error('[chat-handler] Global cache LLM error:', err);
                const errorId = `error-${Date.now()}`;
                writer.write({ type: 'text-start', id: errorId } as never);
                writer.write({ 
                  type: 'text-delta', 
                  id: errorId, 
                  delta: t('ai.error.generic', lang) 
                } as never);
                writer.write({ type: 'text-end', id: errorId } as never);
                writer.write({ type: 'finish', finishReason: 'error' });
              }
          } else {
            const { getMockResponse } = await import('../providers/mock.js');
            const mockText = getMockResponse(latestText, lang);
            responseText = mockText;
            const mockId = `mock-${Date.now()}`;
            writer.write({ type: 'text-start', id: mockId } as never);
            writer.write({ type: 'text-delta', id: mockId, delta: mockText } as never);
            writer.write({ type: 'text-end', id: mockId } as never);
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
  }

  // ── Search / Retrieval ──────────────────────────────────────

  const cacheKey = getSessionCacheKey(req);
  const now = Date.now();

  const cachedContext = cacheKey ? await getCachedContext(cacheKey, cache) : undefined;
  const userTurnCount = messages.filter((m: UIMessage) => m.role === 'user').length;
  const reuseContext = shouldReuseSearchContext({ latestText, cachedContext, userTurnCount, now });

  let searchQuery = buildLocalSearchQuery(latestText) || latestText;
  let relatedArticles = reuseContext && cachedContext ? cachedContext.articles : [];
  let relatedProjects = reuseContext && cachedContext ? cachedContext.projects : [];

  if (reuseContext && cachedContext && cacheKey) {
    searchQuery = cachedContext.query;
    await setCachedContext(cacheKey, { ...cachedContext, updatedAt: now }, cache);
  } else {
    if (hasRealProvider && adapter) {
      const runKW = shouldRunKeywordExtraction({
        messageCount: messages.length,
        localQuery: searchQuery,
        latestText,
      });

      if (runKW) {
        const kwStart = Date.now();
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
          timing.keywordExtraction = Date.now() - kwStart;
          if (kwResult.query && !kwResult.usedFallback) {
            searchQuery = kwResult.query;
            if (kwResult.primaryQuery && kwResult.primaryQuery !== searchQuery) {
              const searchStart = Date.now();
              const primary = searchArticles(kwResult.primaryQuery, { enableDeepContent: false });
              relatedArticles = mergeResults(
                searchArticles(searchQuery, { enableDeepContent: true }),
                primary,
              );
              relatedProjects = searchProjects(searchQuery);
              timing.search = Date.now() - searchStart;
            }
          }
        } catch {
          timing.keywordExtraction = Date.now() - kwStart;
        } finally {
          clearTimeout(timeoutId);
        }
      }
    }

    if (!relatedArticles.length) {
      const searchStart = Date.now();
      relatedArticles = searchArticles(searchQuery, { enableDeepContent: true });
      relatedProjects = searchProjects(searchQuery);
      timing.search = Date.now() - searchStart;
    }

    relatedArticles = rankArticlesByIntent(latestText, relatedArticles);

    if (cacheKey) {
      await setCachedContext(cacheKey, {
        query: searchQuery,
        articles: relatedArticles,
        projects: relatedProjects,
        updatedAt: now,
      }, cache);
    }

    if (publicQuestion && (!publicQuestion.needsContext || articleSlug)) {
      const globalTTL = getGlobalCacheTTL(publicQuestion.type);
      await setGlobalSearchCache(
        cache,
        publicQuestion.type,
        {
          query: searchQuery,
          articles: relatedArticles,
          projects: relatedProjects,
          updatedAt: now,
        },
        globalTTL,
        { articleSlug, lang }
      );
    }
  }

  // ── Evidence Analysis (optional) ────────────────────────────

  let evidenceSection = '';

  if (hasRealProvider && adapter) {
    const skipEvidence = shouldSkipAnalysis(latestText, relatedArticles.length, 'moderate');

    if (!skipEvidence) {
      const evidenceStart = Date.now();
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
        timing.evidenceAnalysis = Date.now() - evidenceStart;
      } catch {
        timing.evidenceAnalysis = Date.now() - evidenceStart;
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
    lang,
  });

  // ── Build System Prompt ─────────────────────────────────────

  const articlePrompt = buildArticleContextPrompt(context);
  const systemPrompt = buildSystemPrompt({
    static: {
      authorName: (env.SITE_AUTHOR as string) || '博主',
      siteUrl: (env.SITE_URL as string) || '',
      lang,
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
      lang,
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
            type: 'source-url',
            sourceId: `source-${article.title}`,
            url: (article as { url?: string }).url ?? '#',
            title: article.title,
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
      let responseText = '';
      let reasoningText: string | undefined;
      let tokenUsage: TokenUsage | undefined;
      const generationStart = Date.now();
      
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
          const reasoningPromise = (result as unknown as { reasoning?: PromiseLike<unknown> }).reasoning;
          const usagePromise = (result as unknown as { usage?: PromiseLike<{ inputTokens?: number; outputTokens?: number; totalTokens?: number }> }).usage;
          
          if (reasoningPromise) {
            try {
              const reasoningOutput = await Promise.resolve(reasoningPromise);
              reasoningText = typeof reasoningOutput === 'string' ? reasoningOutput : 
                (Array.isArray(reasoningOutput) ? reasoningOutput.map((r): string => {
                  if (typeof r === 'object' && r !== null && 'text' in r) return (r as { text: string }).text;
                  return String(r);
                }).join('') : undefined);
            } catch { }
          }
          
          if (usagePromise) {
            try {
              const usage = await Promise.resolve(usagePromise);
              const inputTokens = usage.inputTokens ?? 0;
              const outputTokens = usage.outputTokens ?? 0;
              tokenUsage = {
                total: usage.totalTokens ?? inputTokens + outputTokens,
                input: inputTokens,
                output: outputTokens,
              };
            } catch { }
          }
          
          timing.generation = Date.now() - generationStart;
          responseText = text;
          hasTextOutput = text.length > 0;

          if (hasTextOutput && errors.length === 0) {
            adapter.recordSuccess();
            writer.write({ type: 'finish', finishReason: 'stop' });
            streamSuccess = true;

            // Save to response cache if enabled and public question
            if (responseCacheConfig.enabled && publicQuestion && (!publicQuestion.needsContext || articleSlug)) {
              const globalTTL = getGlobalCacheTTL(publicQuestion.type);
              const responseCacheData: CachedAIResponse = {
                query: searchQuery,
                thinking: reasoningText,
                response: text,
                articles: relatedArticles,
                projects: relatedProjects,
                lang,
                model: adapter.model,
                updatedAt: Date.now(),
              };
              await setResponseCache(cache, publicQuestion.type, responseCacheData, globalTTL, { articleSlug, lang });
            }
          } else if (errors.length > 0) {
            adapter.recordFailure(errors[0]);
            console.error('[chat-handler] Stream error:', errors[0].message);
            const errorId = `error-${Date.now()}`;
            writer.write({ type: 'text-start', id: errorId } as never);
            writer.write({ 
              type: 'text-delta', 
              id: errorId, 
              delta: t('ai.error.generic', lang) 
            } as never);
            writer.write({ type: 'text-end', id: errorId } as never);
            writer.write({ type: 'finish', finishReason: 'error' });
            streamSuccess = true;
          } else if (!hasTextOutput) {
            const noOutputId = `no-output-${Date.now()}`;
            writer.write({ type: 'text-start', id: noOutputId } as never);
            writer.write({ type: 'text-delta', id: noOutputId, delta: t('ai.error.noOutput', lang) } as never);
            writer.write({ type: 'text-end', id: noOutputId } as never);
            writer.write({ type: 'finish', finishReason: 'stop' });
            streamSuccess = true;
          } else {
            writer.write({ type: 'finish', finishReason: 'stop' });
            streamSuccess = true;
          }
        } catch (err) {
          timing.generation = Date.now() - generationStart;
          adapter.recordFailure(err instanceof Error ? err : new Error(String(err)));
          console.error('[chat-handler] Provider threw:', (err as Error).message);
        }
      }

      // Fallback to mock if real provider didn't produce output
      if (!streamSuccess) {
        const { getMockResponse } = await import('../providers/mock.js');
        const mockText = getMockResponse(latestText, lang);
        timing.generation = Date.now() - generationStart;
        responseText = mockText;
        writer.write({
          type: 'message-metadata',
          messageMetadata: createChatStatusData({
            stage: 'answer',
            message: t('ai.status.fallback', lang),
            progress: 80,
          }),
        });
        const fallbackId = `fallback-${Date.now()}`;
        writer.write({ type: 'text-start', id: fallbackId } as never);
        writer.write({ type: 'text-delta', id: fallbackId, delta: mockText } as never);
        writer.write({ type: 'text-end', id: fallbackId } as never);
        writer.write({ type: 'finish', finishReason: 'stop' });
      }

      // Send notification (fire and forget)
      if (responseText) {
        const notifyTiming: PhaseTiming = {
          total: Date.now() - timing.start,
          keywordExtraction: timing.keywordExtraction,
          search: timing.search,
          evidenceAnalysis: timing.evidenceAnalysis,
          generation: timing.generation,
        };
        
        const notifyModel: ModelInfo | undefined = adapter ? {
          name: adapter.model,
          provider: (env.AI_PROVIDER as string) || undefined,
          apiHost: (env.AI_BASE_URL as string) || undefined,
        } : undefined;

        sendNotification({
          env,
          messages,
          responseText,
          relatedArticles,
          model: notifyModel,
          usage: tokenUsage,
          timing: notifyTiming,
          cacheKey,
          waitUntil,
        });
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
