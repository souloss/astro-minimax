---
title: "Getting Started: Two Integration Methods"
pubDatetime: 2026-03-12T00:00:00.000Z
author: Souloss
description: "Start using astro-minimax via GitHub Template for quick setup or NPM packages for modular integration."
tags:
  - docs
  - configuration
category: Blog/Tutorial
featured: true
draft: false
---

## Table of contents

## Overview

astro-minimax offers two integration methods for different use cases:

| Method | Best For | Updates |
|--------|----------|---------|
| **GitHub Template** | One-time setup, full customization | Manual upstream merge |
| **NPM Packages** | Content-system separation, continuous updates | `pnpm update` |

---

## Method 1: GitHub Template (Recommended for Beginners)

### 1. Create Repository

Click **"Use this template"** on the GitHub repo page, or via CLI:

```bash
pnpm create astro@latest --template souloss/astro-minimax
```

### 2. Install Dependencies

```bash
cd your-blog
pnpm install
```

### 3. Configure

Edit `src/config.ts` with your blog details:

```typescript
export const SITE = {
  website: "https://your-domain.com/",
  author: "Your Name",
  title: "My Blog",
  desc: "A personal tech blog",
  // ...
};
```

### 4. Add Content

Place your articles in `src/data/blog/en/` (English) or `src/data/blog/zh/` (Chinese).

### 5. Develop & Deploy

```bash
# Local development
pnpm run dev

# Build
pnpm run build

# Preview build
pnpm run preview
```

Deploy to Vercel, Cloudflare Pages, or Netlify — connect your Git repo for auto deployment.

### 6. Get Upstream Updates

```bash
# Add upstream remote
git remote add upstream https://github.com/souloss/astro-minimax.git

# Fetch and merge
git fetch upstream
git merge upstream/main

# Resolve conflicts and commit
```

---

## Method 2: NPM Package Integration

For users who want to separate content from the theme system. The core theme and visualization plugins are published as independent npm packages.

### 1. Create Astro Project

```bash
pnpm create astro@latest my-blog
cd my-blog
```

### 2. Install Theme Packages

```bash
# Core theme (layouts, components, styles)
pnpm add @astro-minimax/core

# Visualization plugins (Mermaid, Markmap, Rough.js, etc. — optional)
pnpm add @astro-minimax/viz
```

### 3. Configure Astro

Import theme plugins in `astro.config.ts`:

```typescript
import { remarkMermaidCodeblock } from '@astro-minimax/viz/plugins';
import { remarkMarkmapCodeblock } from '@astro-minimax/viz/plugins';

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkMermaidCodeblock, remarkMarkmapCodeblock],
  },
});
```

### 4. Use Layouts & Components

```astro
---
import Layout from '@astro-minimax/core/layouts/Layout.astro';
import Header from '@astro-minimax/core/components/nav/Header.astro';
---

<Layout title="My Post">
  <Header />
  <slot />
</Layout>
```

### 5. Update

```bash
pnpm update @astro-minimax/core @astro-minimax/viz
```

---

## Directory Structure

Regardless of integration method, your blog content structure stays consistent:

```
src/data/blog/
├── zh/                # Chinese articles
│   ├── my-post.md
│   └── _examples/     # Example articles (can be deleted)
├── en/                # English articles
│   ├── my-post.md
│   └── _examples/
```

## Next Steps

- [Configure Theme](/en/posts/how-to-configure-astro-minimax-theme) — Detailed configuration guide
- [Add Posts](/en/posts/adding-new-post) — Frontmatter format reference
- [Customize Colors](/en/posts/customizing-astro-minimax-theme-color-schemes) — Theme color customization
