# Cloudflare Pages Functions

Thin adapter layer for Cloudflare Pages deployment. Core logic lives in `@astro-minimax/ai/server`.

## Structure

```
functions/
  api/
    chat.ts           → AI chat endpoint
    ai-info.ts        → Provider status endpoint
    notify/
      comment.ts      → Comment notification webhook
```

## Local Development

```bash
# From apps/blog directory
pnpm run dev

# Or from repository root
pnpm --filter astro-minimax-blog dev
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

For monorepo deployment, set **Root directory** to `apps/blog` in Cloudflare Pages project settings.

```bash
# Build the site
pnpm run build

# Deploy (from apps/blog directory)
npx wrangler pages deploy dist --project-name=astro-minimax
```

Workers AI binding is configured in `wrangler.toml`:

```toml
[ai]
binding = "minimaxAI"
```
