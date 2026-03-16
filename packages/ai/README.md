# @astro-minimax/ai

Vendor-agnostic AI integration package with full RAG pipeline for astro-minimax blogs. Supports OpenAI-compatible APIs, Cloudflare Workers AI, and mock fallback.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Components (ChatPanel / AIChatWidget / AIChatContainer) │
│  → useChat + DefaultChatTransport                        │
└──────────────────────────┬──────────────────────────────┘
                           │ POST /api/chat
┌──────────────────────────▼──────────────────────────────┐
│  Server (chat-handler.ts)                                │
│  Rate Limit → Validate → Search → Evidence → Prompt →   │
│  Provider Manager → streamText → SSE Response            │
└──────────────────────────┬──────────────────────────────┘
                           │
     ┌─────────────────────┼──────────────────────┐
     │                     │                      │
 ┌───▼───┐          ┌─────▼─────┐          ┌─────▼────┐
 │OpenAI │          │Workers AI │          │   Mock   │
 │Compat │          │ Binding   │          │ Fallback │
 └───────┘          └───────────┘          └──────────┘
```

### Modules

| Module | Purpose |
|--------|---------|
| `server/` | Reusable API handlers (`handleChatRequest`, `initializeMetadata`) |
| `provider-manager/` | Multi-provider management with priority, failover, health tracking |
| `search/` | In-memory article/project search with session caching |
| `intelligence/` | Keyword extraction, evidence analysis, citation guard |
| `prompt/` | Three-layer system prompt builder (static → semi-static → dynamic) |
| `data/` | Build-time metadata loading (summaries, author context, voice profile) |
| `stream/` | Stream helpers and response utilities |
| `components/` | Preact UI components (ChatPanel, AIChatWidget, AIChatContainer) |

## Installation

```bash
pnpm add @astro-minimax/ai
```

The `@astro-minimax/core` integration auto-detects this package and renders the AI chat widget.

## Configuration

In `src/config.ts`:

```typescript
export const SITE = {
  ai: {
    enabled: true,
    mockMode: false,
    apiEndpoint: "/api/chat",
    welcomeMessage: undefined, // auto-generated
    placeholder: undefined,
  },
};
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_BASE_URL` | For OpenAI | Base URL of OpenAI-compatible API |
| `AI_API_KEY` | For OpenAI | API key |
| `AI_MODEL` | Recommended | Model name (default: `gpt-4o-mini`) |
| `AI_KEYWORD_MODEL` | Optional | Model for keyword extraction (defaults to `AI_MODEL`) |
| `AI_EVIDENCE_MODEL` | Optional | Model for evidence analysis (defaults to keyword model) |
| `AI_BINDING_NAME` | For Workers | Cloudflare AI binding name (default: `AI`) |
| `SITE_AUTHOR` | Recommended | Author name for prompts |
| `SITE_URL` | Recommended | Site URL for article links |

## Server Module

The server module provides reusable request handlers, decoupled from any specific runtime (Cloudflare, Node.js, etc.).

### Usage in Cloudflare Pages Functions

```typescript
// functions/api/chat.ts
import { handleChatRequest, initializeMetadata } from '@astro-minimax/ai/server';
import summaries from '../../datas/ai-summaries.json';
import authorContext from '../../datas/author-context.json';
import voiceProfile from '../../datas/voice-profile.json';

export const onRequest: PagesFunction = async (context) => {
  initializeMetadata({ summaries, authorContext, voiceProfile }, context.env);
  return handleChatRequest({ env: context.env, request: context.request });
};
```

### Chat API Contract

**Request:** `POST /api/chat`

```json
{
  "context": {
    "scope": "article",
    "article": {
      "slug": "my-post",
      "title": "My Post Title",
      "summary": "Brief summary...",
      "keyPoints": ["Point 1", "Point 2"],
      "categories": ["tech"]
    }
  },
  "id": "article:my-post",
  "messages": [...]
}
```

`context.scope` values:
- `"global"` — General blog chat (default)
- `"article"` — Reading companion mode, focused on a specific article

**Response:** UI Message Stream Protocol (SSE)

- `text-start` / `text-delta` / `text-end` — Streaming text content
- `source` — RAG article references
- `message-metadata` — Processing status updates
- `finish` — Stream completion

**Error Response:**

```json
{
  "error": "请求太频繁，请稍后再试",
  "code": "RATE_LIMITED",
  "retryable": true,
  "retryAfter": 10
}
```

| Code | Status | Retryable | Description |
|------|--------|-----------|-------------|
| `RATE_LIMITED` | 429 | Yes | Too many requests |
| `PROVIDER_UNAVAILABLE` | 503 | Yes | All providers failed |
| `TIMEOUT` | 504 | Yes | Request timeout |
| `INPUT_TOO_LONG` | 400 | No | Message exceeds limit |
| `INVALID_REQUEST` | 400 | No | Malformed request |
| `INTERNAL_ERROR` | 500 | Yes | Server error |

## Provider System

### Priority & Failover

```
Workers AI (weight: 100) → OpenAI Compatible (weight: 90) → Mock (weight: 0)
```

When a provider fails, the next one is tried automatically. Mock fallback ensures users always get a response.

### Timeout Budget (per request: 45s total)

| Stage | Timeout | Behavior on timeout |
|-------|---------|-------------------|
| Keyword extraction | 5s | Falls back to local search query |
| Evidence analysis | 8s | Skipped |
| LLM streaming | 30s | Tries next provider, then mock |

## "Read & Chat" (边读边聊)

When a user opens the AI chat on an article page, the system enters **reading companion mode**:

1. **Article context** flows from `PostDetails.astro` → `Layout.astro` → `AIChatWidget` → `ChatPanel`
2. **Welcome message** references the current article title
3. **Quick prompts** are article-specific (summarize, explain, related topics)
4. **API request** includes `context: { scope: "article", article: {...} }`
5. **Server** enhances the prompt with article summary, key points, and reading companion instructions

## Components

### AIChatWidget.astro

Astro entry point. Accepts `lang` and optional `articleContext` props. Renders `AIChatContainer` with `client:idle`.

### AIChatContainer.tsx

Manages open/close state. Exposes `window.__aiChatToggle` for the floating action button.

### ChatPanel.tsx

Core chat UI built on `useChat` from `@ai-sdk/react`:
- `DefaultChatTransport` with `prepareSendMessagesRequest` for context injection
- Parts-based message rendering (`text`, `source`, custom data parts)
- Error display with retry button (`regenerate()`)
- Status indicators from message metadata
- Mock mode with character-by-character streaming simulation

## Exports

| Path | Contents |
|------|----------|
| `.` | All modules |
| `./server` | `handleChatRequest`, `initializeMetadata`, error helpers, types |
| `./providers` | Mock response/stream utilities |
| `./middleware` | Rate limiting |
| `./search` | Article/project search, session cache |
| `./intelligence` | Keyword extraction, evidence analysis, citation guard |
| `./prompt` | System prompt builder |
| `./data` | Metadata loading |
| `./stream` | Stream utilities |
| `./components/*` | Astro/Preact components |
