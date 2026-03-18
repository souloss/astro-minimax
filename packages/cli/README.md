# @astro-minimax/cli

CLI tool to scaffold a new blog project using the astro-minimax theme.

## Usage

```bash
# npx (recommended)
npx @astro-minimax/cli my-blog

# pnpm
pnpm dlx @astro-minimax/cli my-blog

# yarn
yarn dlx @astro-minimax/cli my-blog
```

## Generated Structure

```
my-blog/
├── astro.config.ts      # Astro + minimax integration config
├── package.json         # Dependencies (core, viz, tailwind, etc.)
├── tsconfig.json        # TypeScript configuration
├── public/
│   └── favicon.svg
└── src/
    ├── config.ts        # SITE configuration object
    ├── constants.ts     # Social links and share links
    ├── content.config.ts # Astro content collection schema
    ├── env.d.ts
    └── data/
        ├── blog/zh/hello-world.md   # Sample blog post
        └── friends.ts               # Friend links data
```

No `src/pages/` directory — all routes are injected by `@astro-minimax/core`.

## After Scaffolding

1. **Install dependencies:**

   ```bash
   cd my-blog && pnpm install
   ```

2. **Configure your site** in `src/config.ts`:
   - Set `website`, `author`, `title`, `desc`
   - Configure features (tags, categories, series, etc.)

3. **Start development:**

   ```bash
   pnpm dev
   ```

4. **Add blog posts** in `src/data/blog/zh/` (Chinese) or `src/data/blog/en/` (English).

## Features

### Built-in Features

| Feature    | Description                 | Default |
| ---------- | --------------------------- | ------- |
| Tags       | Tag-based article filtering | Enabled |
| Categories | Category-based navigation   | Enabled |
| Series     | Article series grouping     | Enabled |
| Archives   | Time-based article archive  | Enabled |
| Search     | Full-text search (Pagefind) | Enabled |
| Dark Mode  | Light/dark theme toggle     | Enabled |

### Content Enhancements

| Feature | Syntax               | Description                               |
| ------- | -------------------- | ----------------------------------------- |
| Mermaid | ` ```mermaid `       | Flowcharts, sequence diagrams, pie charts |
| Markmap | ` ```markmap `       | Interactive mind maps                     |
| Math    | `$...$` or `$$...$$` | KaTeX math equations                      |
| Code    | ` ```language `      | Shiki syntax highlighting                 |
| Emoji   | `:emoji_name:`       | Emoji shortcodes                          |
| Alerts  | `> [!NOTE]`          | GitHub-style alerts                       |
| Tables  | Markdown tables      | Styled responsive tables                  |

## CLI Commands

### `astro-minimax init <project>`

Create a new blog project.

### `astro-minimax post <subcommand>`

Manage blog posts:

| Subcommand | Description |
| ---------- | ----------- |
| `new "Title"` | Create a new post with frontmatter |
| `list` | List all posts |
| `stats` | Show post statistics |

### `astro-minimax hooks <subcommand>`

Manage Git hooks for automatic date management:

| Subcommand | Description |
| ---------- | ----------- |
| `install` | Install Husky and pre-commit hook |
| `uninstall` | Remove hooks and Husky |
| `status` | Show current hooks status |

**What the pre-commit hook does:**

- Auto-fills `pubDatetime` for new `.md` files (only if empty)
- Auto-fills `modDatetime` for modified files when `draft: false` (only if empty)
- Handles `draft: first` for first-time publishing

> **Important:** Manually specified dates are NEVER overwritten. The hook only fills empty/missing values.

**Works with:**
- Single projects (created via `astro-minimax init`)
- Monorepos (detects git root automatically)

### `astro-minimax ai <subcommand>`

AI content processing:

| Subcommand | Description |
| ---------- | ----------- |
| `process` | Process posts (summary + SEO) |
| `seo` | Generate SEO metadata |
| `summary` | Generate summaries |
| `eval` | Evaluate AI chat quality |

### `astro-minimax profile <subcommand>`

Author profile management:

| Subcommand | Description |
| ---------- | ----------- |
| `build` | Build complete profile |
| `context` | Build author context |
| `voice` | Build voice profile |
| `report` | Generate profile report |

### `astro-minimax data <subcommand>`

Data management:

| Subcommand | Description |
| ---------- | ----------- |
| `status` | Show data file status |
| `clear` | Clear generated cache |

### `astro-minimax podcast <subcommand>`

Generate AI podcasts from blog posts:

| Subcommand | Description |
| ---------- | ----------- |
| `generate` | Generate podcasts from blog posts |
| `list` | List generated podcasts |
| `feed` | Generate podcast RSS feed |

**Features:**
- Converts blog posts to multi-speaker dialogue (host/guest format)
- Uses OpenAI TTS for audio synthesis with natural Chinese voices
- FFmpeg for audio concatenation
- Automatic caching and skip list for failed items
- RSS feed generation for podcast apps

**Options for `generate`:**

| Option | Description |
| ------ | ----------- |
| `--force` | Regenerate all (ignore cache) |
| `--slug=<slug>` | Process only specified post |
| `--task=<type>` | "script" (text only) or "audio" (full) |
| `--dry-run` | Preview without generating |
| `--lang=<zh\|en>` | Process only specified language |

**Environment Variables:**

```env
AI_API_KEY=your-openai-api-key    # Required for script generation
AI_BASE_URL=https://api.openai.com  # Optional, for custom endpoints
AI_MODEL=gpt-4o-mini               # Optional, model for script generation
```

**Output:**
- Scripts: `datas/podcast-scripts.json`
- Audio: `public/podcasts/{lang}/{slug}.mp3`
- RSS: `public/podcast.xml`

**Examples:**

```bash
# Generate all podcasts
astro-minimax podcast generate

# Generate single article
astro-minimax podcast generate --slug=zh/getting-started

# Generate script only (no audio)
astro-minimax podcast generate --task=script

# Preview what would be generated
astro-minimax podcast generate --dry-run

# List generated podcasts
astro-minimax podcast list

# Generate RSS feed
astro-minimax podcast feed
```

## Customization

- **Colors**: Override CSS custom properties in your own CSS file
- **Features**: Toggle features in `SITE.features`
- **Visualizations**: Use mermaid/markmap code blocks in Markdown

## AI Chat Setup

The template includes Preact integration ready for AI features.

### Step 1: Install AI Package

```bash
pnpm add @astro-minimax/ai
```

### Step 2: Enable in Config

Update `src/config.ts`:

```typescript
features: {
  ai: true,  // Enable AI feature flag
},

ai: {
  enabled: true,
  mockMode: false,
  apiEndpoint: "/api/chat",
},
```

### Step 3: Create API Endpoint

Create `functions/api/chat.ts`:

```typescript
import { handleChatRequest, initializeMetadata } from '@astro-minimax/ai/server';

export const onRequest: PagesFunction = async (context) => {
  initializeMetadata({}, context.env);
  return handleChatRequest({ env: context.env, request: context.request });
};
```

### Step 4: Configure Environment

Create `.env` file:

```env
# OpenAI-compatible API
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your-api-key
AI_MODEL=gpt-4o-mini

# Or use Cloudflare Workers AI (in wrangler.toml)
# [ai]
# binding = "AI"
```

### Step 5: Run Dev Server

For local development with AI:

```bash
# Start AI dev server (port 8787)
node dev-ai-server.mjs

# In another terminal, start Astro dev
pnpm dev
```

The AI widget will appear as a floating button on your blog.

## Optional Packages

| Package             | Purpose                  |
| ------------------- | ------------------------ |
| `@astro-minimax/ai` | AI chat assistant widget |

## Related Articles

- [快速开始：两种使用方式](https://demo-astro-minimax.souloss.cn/zh/posts/getting-started)
- [如何在 Astro 博客文章中添加 LaTeX 公式](https://demo-astro-minimax.souloss.cn/zh/posts/add-latex-to-astro-blog)
- [如何使用 Git 钩子设置创建和修改日期](https://demo-astro-minimax.souloss.cn/zh/posts/git-hooks-for-date)
- [如何更新 astro-minimax 的依赖](https://demo-astro-minimax.souloss.cn/zh/posts/update-dependencies)
- [在 astro-minimax 中动态生成 OG 图片](https://demo-astro-minimax.souloss.cn/zh/posts/dynamic-og-image)
