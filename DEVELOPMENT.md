# Development Guide

## Prerequisites

- Node.js >= 22.12.0
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
│   └── functions/      # Cloudflare Pages Functions (thin adapters)
├── packages/
│   ├── core/           # Theme: layouts, components, pages, styles, visualizations
│   ├── ai/             # AI: RAG pipeline, providers, chat UI
│   ├── notify/         # Multi-channel notifications (Telegram, Webhook, Email)
│   └── cli/            # CLI tools + scaffolding (AI processing, profile, eval)
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

## Build-Time Tools (CLI)

All tools are in `packages/cli` and accessible via the `astro-minimax` CLI or `pnpm run` shortcuts:

```bash
# AI content processing
pnpm run ai:process         # Generate summaries + SEO metadata
pnpm run ai:seo             # Generate SEO metadata only
pnpm run ai:summary         # Generate summaries only
pnpm run ai:eval            # Evaluate AI chat quality

# Author profile
pnpm run profile:build      # Build complete profile (context + voice + report)
pnpm run profile:context    # Build author context
pnpm run profile:voice      # Build voice profile
pnpm run profile:report     # Generate author profile report

# Post management
pnpm run post:new           # Create a new post
pnpm run post:list          # List all posts
pnpm run post:stats         # Show post statistics

# Data management
pnpm run data:status        # Show data files status
pnpm run data:clear         # Clear generated data caches
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

---

## Development Standards

### UI/UX Design Standards

#### Glass Morphism Design System

The project uses a glass morphism design system. All card-like components should use unified styles:

```html
<!-- Recommended card template -->
<article class="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md 
                transition-all duration-300 ease-out 
                hover:border-accent/25 hover:bg-card-hover hover:shadow-xl 
                hover:-translate-y-1">
  ...
</article>
```

**Key style parameters:**
| Property | Value | Description |
|----------|-------|-------------|
| `border-radius` | `rounded-2xl` | Cards use 1rem radius uniformly |
| `background` | `bg-card/60` | 60% opacity |
| `backdrop-blur` | `backdrop-blur-md` | Medium blur |
| `hover transform` | `hover:-translate-y-1` | Float up 4px |

#### Unified Hover Effects

```css
/* Recommended hover effects */
transition-all duration-300 ease-out
hover:border-accent/25
hover:bg-card-hover
hover:shadow-xl
hover:-translate-y-1

/* Avoid */
hover:scale-105  /* Breaks layout stability */
```

#### Icon Container Standard

```html
<!-- Unified icon container style -->
<div class="flex size-10 items-center justify-center rounded-xl 
            bg-accent/10 text-accent transition-colors 
            group-hover:bg-accent/15">
  <svg class="size-5" viewBox="0 0 24 24">...</svg>
</div>
```

#### Responsive Design

**Progressive Navigation Simplification:**

For multi-language navigation with varying text lengths, use progressive simplification:

```html
<!-- Nav item: icon on tablet, icon+text on desktop -->
<a class="flex items-center rounded-xl py-2 
          px-2.5 lg:px-3.5 lg:gap-2">
  <Icon class="size-4 shrink-0" />
  <span class="hidden lg:inline">{label}</span>
</a>
```

| Screen Size | Breakpoint | Display |
|------------|------------|---------|
| Mobile | < 640px | Hamburger menu |
| Tablet | 640px ~ 1024px | Icons only + title attribute |
| Desktop | ≥ 1024px | Icons + text |

#### CSS Variables Usage

Use theme variables instead of hardcoded values:

```css
/* Recommended */
color: var(--accent);
background: var(--card);
border-color: var(--border);

/* Avoid */
color: #0a9396;
background: rgba(255, 255, 255, 0.6);
```

---

### Internationalization (i18n) Standards

#### Translation Key Naming Convention

Use `module.key` format for clarity:

```typescript
// Recommended
"settings.title": "偏好设置"
"categories.count": "个分类"
"series.articles": "{count} 篇文章"
"unit.minutes": "分钟"

// Avoid
"偏好设置": "Preferences"  // No namespace
"catCount": "个分类"       // Unclear abbreviation
```

#### Translation File Structure

All translations are centralized in `packages/core/src/utils/i18n.ts`:

```typescript
export type TranslationKey =
  | "nav.home"
  | "nav.posts"
  | "settings.title"
  // ... grouped by module

const translations: Record<string, Record<TranslationKey, string>> = {
  en: {
    "nav.home": "Home",
    "settings.title": "Preferences",
  },
  zh: {
    "nav.home": "首页",
    "settings.title": "偏好设置",
  },
};
```

#### Using Translation Function

```astro
---
import { t } from "../../utils/i18n";
const lang = "zh";
---

<!-- Recommended -->
<span>{t("unit.categories", lang)}</span>
<span>{t("series.articles", lang).replace("{count}", String(total))}</span>

<!-- Avoid -->
<span>{lang === "zh" ? "个分类" : "categories"}</span>
```

#### When Inline Language Checks Are Acceptable

1. **Date formatting** (localization, not translation):
   ```typescript
   const dateStr = lang === "zh" 
     ? datetime.format("YYYY 年 M 月 D 日") 
     : datetime.format("MMM D, YYYY");
   ```

2. **Language switcher button** (displays target language name):
   ```typescript
   label.textContent = isZh ? "EN" : "中";
   ```

#### Steps to Add New Translations

1. Add key to `TranslationKey` type
2. Add translations to both `en` and `zh` objects
3. Use `t("key", lang)` in components

---

### Component Development Standards

#### Prefer Server-Side Rendering

For list components, prefer SSR to avoid client-side JavaScript issues:

```astro
<!-- Recommended: SSR -->
<ul class="space-y-1">
  {posts.map(post => (
    <li><a href={post.href}>{post.title}</a></li>
  ))}
</ul>

<!-- Avoid: Client-side may lose data -->
<div data-posts-grid></div>
<script>
  document.querySelector('[data-posts-grid]') // Only selects first match!
</script>
```

#### Entrance Animations

Use staggered delays for elegant entrance animations:

```astro
{items.map((item, index) => {
  const delay = Math.min(index * 80, 400);  // Max 400ms delay
  return (
    <article 
      class="card-animate"
      style={`animation-delay: ${delay}ms`}
    >...</article>
  );
})}
```

---

### Code Quality Standards

#### Prohibited Practices

```typescript
// ❌ Type error suppression
const value = data as any;
// @ts-ignore
// @ts-expect-error

// ❌ Empty catch blocks
try { doSomething(); } catch (e) {}

// ❌ Deleting tests to pass
// test.skip('...', () => {})

// ❌ Unused variables
const unused = getData();
```

#### Required Practices

```typescript
// ✅ Proper type definitions
interface Post {
  title: string;
  href: string;
  description?: string;
}

// ✅ Meaningful error handling
try {
  await saveSettings(settings);
} catch (error) {
  console.error('Failed to save settings:', error);
  showToast('保存失败，请重试');
}

// ✅ Optional chaining and nullish coalescing
const title = post?.title ?? 'Untitled';
```

#### Build Verification

Always run build after code changes:

```bash
pnpm run build
```

Ensure:
- 0 build errors
- All pages generated correctly
- Search index built properly

---

### Common Issues & Solutions

#### Issue 1: Archive Page Posts Not Displaying

**Symptoms:** Archive page shows post count but list is empty

**Cause:** `PostsContainer` uses client-side JS, `querySelector` only selects first match

**Solution:** Use server-side rendering

```astro
<!-- Before: Client-side -->
<PostsContainer posts={posts} lang={lang} />

<!-- After: SSR -->
<ul>
  {posts.map(post => (
    <li><a href={post.href}>{post.title}</a></li>
  ))}
</ul>
```

#### Issue 2: English Navigation Space Issues

**Symptoms:** English nav items are longer, squeezing the site title

**Solution:** Progressive simplification - icons on tablet, text on desktop

```html
<span class="hidden lg:inline">{label}</span>
```

#### Issue 3: Inconsistent Design

**Symptoms:** Different pages have different card styles

**Solution:** Use unified design system variables and styles

```html
<article class="rounded-2xl border border-border/50 bg-card/60 
                backdrop-blur-md transition-all duration-300 
                hover:border-accent/25 hover:-translate-y-1 hover:shadow-xl">
</article>
```

#### Issue 4: i18n Hard to Maintain

**Symptoms:** Translation strings scattered everywhere, `isZh ? '中文' : 'English'` pattern repeated

**Solution:** Centralize translation resources

1. All keys defined in `i18n.ts`
2. Use `t()` function for translations
3. New UI text must add translation key first

---

### Pre-Commit Checklist

- [ ] Run `pnpm run build` to verify build
- [ ] New UI text added to `i18n.ts`
- [ ] Card styles follow glass morphism design system
- [ ] Hover effects unified (float + shadow)
- [ ] Responsive layout works at all breakpoints
- [ ] No `as any` or `@ts-ignore`

### Code Review Points

- [ ] Are there hardcoded color values?
- [ ] Are there inline translations that should be in `i18n.ts`?
- [ ] Does client-side script handle multiple component instances correctly?
- [ ] Does it follow existing naming and structure conventions?
