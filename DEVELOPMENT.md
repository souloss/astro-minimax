# Development Guide

## Prerequisites

- Node.js >= 18
- pnpm >= 9

## Quick Start

```bash
git clone https://github.com/souloss/astro-minimax.git
cd astro-minimax
pnpm install
pnpm run dev
```

## Project Structure

```
astro-minimax/
├── apps/blog/          # Example blog (user-facing)
│   ├── src/config.ts   # Site configuration
│   ├── src/data/blog/  # Blog content (Markdown)
│   ├── datas/          # AI-generated metadata (do not edit manually)
│   ├── functions/      # Cloudflare Pages Functions (thin adapters)
│   └── tools/          # Build-time AI processing scripts
├── packages/
│   ├── core/           # Theme: layouts, components, pages, styles
│   ├── ai/             # AI: RAG pipeline, providers, chat UI
│   ├── viz/            # Visualization: Mermaid, Markmap, etc.
│   └── create-astro-minimax/  # Scaffolding CLI
└── docs/               # Architecture documentation
```

## Local AI Development

### 1. Configure Environment

Copy `.env` in `apps/blog/` and set your API credentials:

```bash
# OpenAI-compatible API (works with DeepSeek, Moonshot, Qwen, etc.)
AI_BASE_URL=https://api.example.com/v1
AI_API_KEY=your-key
AI_MODEL=your-model

SITE_AUTHOR=YourName
SITE_URL=http://localhost:4321
```

### 2. Start Development Server

```bash
pnpm run dev
```

This runs `wrangler pages dev -- astro dev`, which:
- Starts the Astro dev server
- Proxies `/api/*` to Cloudflare Pages Functions in `functions/`
- Loads `.env` variables into the function environment
- Workers AI binding is not available locally; the ProviderManager automatically falls back to OpenAI-compatible API

### 3. Test AI Chat

Open the blog and click the AI chat button (floating action button).
- With valid `AI_BASE_URL` + `AI_API_KEY`: Live AI responses
- Without credentials: Mock mode with predefined responses

### Alternative: Astro-only dev (no AI)

```bash
pnpm run dev:astro
```

## Package Development

### packages/ai

```bash
cd packages/ai
pnpm run build          # Compile TypeScript
pnpm run build:watch    # Watch mode
```

Changes in `src/components/` are picked up directly by Astro's Vite (no build needed).
Changes in other `src/` files require `pnpm run build` or watch mode.

### packages/core

No build step — exports source files directly. Changes take effect immediately.

## Build-Time Tools

AI processing scripts live in `apps/blog/tools/`:

```bash
pnpm run ai:process         # Generate summaries + SEO metadata
pnpm run context:build      # Build author context
pnpm run voice:build        # Build voice profile
pnpm run tools:vectorize    # Generate article vectors
```

These scripts read from `src/data/blog/` and write to `datas/`. The generated JSON files are loaded by the AI server at runtime.

**URL strategy**: Tool scripts generate relative paths (`/zh/my-post`). The server prepends `SITE_URL` at runtime, making the data deployment-agnostic.

## Build & Deploy

```bash
pnpm run build    # Type check + Astro build + Pagefind index
pnpm run preview  # Preview with wrangler (including Functions)
```

### Cloudflare Pages Deployment

```bash
npx wrangler pages deploy dist --project-name=astro-minimax
```

Set environment variables in the Cloudflare Dashboard:
- `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`
- `SITE_AUTHOR`, `SITE_URL`

Workers AI binding is configured in `wrangler.toml`.
