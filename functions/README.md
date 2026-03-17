# Cloudflare Pages Functions

Thin adapter layer for Cloudflare Pages deployment. Core logic lives in `@astro-minimax/ai/server`.

> **Note:** For monorepo projects, the `functions/` directory must be at the repository root (same location as `wrangler.toml`) for Cloudflare Pages to detect it.

## Structure

```
functions/
  api/
    chat.ts           → AI chat endpoint (uses datas from apps/blog/datas/)
    ai-info.ts        → Provider status endpoint
    notify/
      comment.ts      → Comment notification webhook
```

## Local Development

```bash
# From repository root
pnpm run dev

# Or from apps/blog:
cd apps/blog && pnpm run dev
```

## Environment Variables

Configure in `.env` (local) or Cloudflare Dashboard (production):

| Variable          | Description                                    |
| ----------------- | ---------------------------------------------- |
| `AI_BASE_URL`     | OpenAI-compatible API base URL                 |
| `AI_API_KEY`      | API key                                        |
| `AI_MODEL`        | Model name                                     |
| `AI_BINDING_NAME` | Workers AI binding name (default: `minimaxAI`) |
| `SITE_AUTHOR`     | Author name for AI prompts                     |
| `SITE_URL`        | Site URL for article links                     |

## Deployment

```bash
# Build the site
pnpm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy apps/blog/dist --project-name=astro-minimax
```

Workers AI binding is configured in `wrangler.toml` at repository root:

```toml
[ai]
binding = "minimaxAI"
```
