# AI System Architecture

## Overview

The AI system provides a RAG-powered chat assistant for the blog. It runs as a Cloudflare Pages Function (production) or via `wrangler pages dev` (local development).

```
User Browser                    Cloudflare Edge
┌──────────────┐               ┌─────────────────────────────┐
│  ChatPanel   │──POST /api/──▶│  chat-handler.ts            │
│  (useChat)   │   chat        │  ┌─────────────────────┐    │
│              │◀──SSE────────│  │ RAG Pipeline         │    │
└──────────────┘               │  │ Rate Limit           │    │
                               │  │ → Search/Retrieve    │    │
                               │  │ → Keyword Extract    │    │
                               │  │ → Evidence Analysis  │    │
                               │  │ → Citation Guard     │    │
                               │  │ → Prompt Build       │    │
                               │  │ → Stream Response    │    │
                               │  └──────┬──────────────┘    │
                               │         │                    │
                               │  ┌──────▼──────────────┐    │
                               │  │ Provider Manager     │    │
                               │  │ OpenAI → Workers → Mock  │
                               │  └─────────────────────┘    │
                               └─────────────────────────────┘
```

## Chat Modes

### Global Mode (`scope: "global"`)

Standard blog chat. The RAG pipeline searches all articles based on the user's question.

### Article Reading Mode (`scope: "article"`)

"边读边聊" — reading companion. Article metadata flows from the page to the chat:

```
PostDetails.astro
  → builds articleContext { slug, title, summary, keyPoints }
  → Layout.astro (articleContext prop)
    → AIChatWidget.astro
      → ChatPanel.tsx
        → prepareSendMessagesRequest injects context
          → POST /api/chat { context: { scope: "article", article: {...} } }
            → chat-handler builds article-focused prompt
```

## Provider Degradation

```
┌─────────────────┐     fail     ┌─────────────────┐     fail     ┌──────────┐
│  OpenAI Compat  │────────────▶│   Workers AI    │────────────▶│   Mock   │
│  weight: 90     │              │   weight: 100   │              │  weight: 0│
│  timeout: 30s   │              │   timeout: 20s  │              │  instant  │
└─────────────────┘              └─────────────────┘              └──────────┘
```

Mock fallback guarantees users always receive a response.

## Request Timeout Budget

Total: **45 seconds**

| Stage | Budget | On timeout |
|-------|--------|------------|
| Rate limit check | < 1ms | Block if exceeded |
| Keyword extraction | 5s | Fall back to local query |
| Search (in-memory) | < 100ms | — |
| Evidence analysis | 8s | Skip |
| LLM streaming | 30s | Try next provider → mock |

## Prompt Architecture (Three Layers)

```
┌─────────────────────────────────┐
│ Static Layer                     │
│ - Author identity & rules        │
│ - Response format guidelines     │
│ - Citation requirements          │
├─────────────────────────────────┤
│ Semi-Static Layer                │
│ - Author context (posts, skills) │
│ - Voice profile (tone, style)    │
├─────────────────────────────────┤
│ Dynamic Layer                    │
│ - Retrieved articles & projects  │
│ - Evidence analysis results      │
│ - Article context (if reading)   │
│ - Reading companion instructions │
└─────────────────────────────────┘
```

## Metadata Pipeline

```
Build Time                          Runtime
┌────────────────┐                 ┌──────────────────────┐
│ tools/          │                 │ initializeMetadata() │
│ - ai-process   │──generates──▶  │ → preloadMetadata()  │
│ - context:build│  datas/*.json   │ → initArticleIndex() │
│ - voice:build  │                 │ → initProjectIndex() │
└────────────────┘                 └──────────────────────┘
```

Data files in `datas/`:
- `ai-summaries.json` — Article summaries, key points, tags
- `author-context.json` — Author profile, post list, stable facts
- `voice-profile.json` — Writing style and tone characteristics

URLs in metadata are stored as **relative paths** (`/zh/my-post`). The server prepends `SITE_URL` at runtime.

## Error Handling

### Server Errors

Structured JSON responses with `{ error, code, retryable, retryAfter? }`.

| Code | HTTP | Retryable | User Message |
|------|------|-----------|-------------|
| `RATE_LIMITED` | 429 | Yes | 请求太频繁，请稍后再试 |
| `PROVIDER_UNAVAILABLE` | 503 | Yes | AI 服务暂时不可用 |
| `TIMEOUT` | 504 | Yes | 响应超时，请重试或简化问题 |
| `INPUT_TOO_LONG` | 400 | No | 消息过长，请精简后重试 |
| `INVALID_REQUEST` | 400 | No | 请求格式有误 |
| `INTERNAL_ERROR` | 500 | Yes | 服务异常，请稍后再试 |

### Client Error Display

`useChat` returns `error` object and `regenerate()` for retry. Retryable errors show a retry button.

## AI SDK v6 Integration

The chat UI uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport`:

- **Parts-based rendering**: Messages rendered via `UIMessage.parts` (text, source, data)
- **Source parts**: RAG article references displayed as clickable cards
- **Transient data parts**: Processing status (not persisted in history)
- **Message metadata**: Token usage, model info, timing
- **`prepareSendMessagesRequest`**: Injects chat context (scope + article) into request body
