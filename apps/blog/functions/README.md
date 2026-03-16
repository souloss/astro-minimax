# Cloudflare Pages Functions

Thin adapter layer for Cloudflare Pages deployment. Core logic lives in `@astro-minimax/ai/server`.

## Structure

```
functions/
  api/
    chat.ts      → handleChatRequest() from @astro-minimax/ai/server
    ai-info.ts   → Provider status endpoint
```

## Local Development

```bash
# Starts Astro dev server + Cloudflare Functions proxy
pnpm run dev

# This runs: wrangler pages dev -- astro dev
# - Astro serves the frontend at localhost:4321
# - Wrangler proxies /api/* to functions/
# - Environment variables from .env are passed to functions
```

## Environment Variables

Configure in `.env` (local) or Cloudflare Dashboard (production):

| Variable | Description |
|----------|-------------|
| `AI_BASE_URL` | OpenAI-compatible API base URL |
| `AI_API_KEY` | API key |
| `AI_MODEL` | Model name |
| `AI_BINDING_NAME` | Workers AI binding name (default: `minimaxAI`) |
| `SITE_AUTHOR` | Author name for AI prompts |
| `SITE_URL` | Site URL for article links |

## Deployment

```bash
# Build the site
pnpm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=astro-minimax
```

Workers AI binding is configured in `wrangler.toml`:

```toml
[ai]
binding = "souloss"
```
