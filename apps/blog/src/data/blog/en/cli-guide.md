---
title: "CLI Tools Guide"
pubDatetime: 2026-03-17T00:00:00.000Z
author: Souloss
description: "Complete guide to @astro-minimax/cli: create blogs, manage posts, AI content processing, author profiles, and data management."
tags:
  - docs
  - cli
  - tools
category: Tutorial/Tools
featured: false
draft: false
---

`@astro-minimax/cli` provides a comprehensive command-line toolkit for blog project management and AI content processing. This guide covers all available commands.

## Table of contents

## Installation

The CLI is installed as a dev dependency:

```bash
pnpm add -D @astro-minimax/cli
```

Use via `astro-minimax` command or `pnpm run` shortcuts.

## Create a New Blog

```bash
npx @astro-minimax/cli init my-blog
```

Generates a complete blog project with config files, sample content, and AI toolchain.

## Post Management

### Create Posts

```bash
pnpm run post:new -- "Post Title"
pnpm run post:new -- "Chinese Title" --lang=zh
pnpm run post:new -- "Tutorial" --category="Tutorial/Frontend"
```

### List Posts

```bash
pnpm run post:list
```

Shows all posts sorted by date, with draft indicators.

### Post Statistics

```bash
pnpm run post:stats
```

## AI Content Processing

Requires environment variables:

```bash
# .env
AI_API_KEY=your-api-key
AI_BASE_URL=https://api.openai.com  # optional
AI_MODEL=gpt-4o-mini                 # optional
```

### Process Articles

```bash
pnpm run ai:process                          # Process all (summaries + SEO)
pnpm run ai:process -- --force               # Force reprocess
pnpm run ai:process -- --slug=en/my-post     # Specific article
pnpm run ai:process -- --lang=en             # English only
pnpm run ai:process -- --dry-run             # Preview mode
```

### AI Quality Evaluation

```bash
pnpm run ai:eval                                    # Test local server
pnpm run ai:eval -- --url=https://your-blog.com     # Test production
pnpm run ai:eval -- --category=no_answer             # Specific category
pnpm run ai:eval -- --verbose                        # Detailed output
```

## Author Profile

```bash
pnpm run profile:build      # Full build (context + voice + report)
pnpm run profile:context    # Author context only
pnpm run profile:voice      # Voice style only
pnpm run profile:report     # Profile report only
```

## Data Management

```bash
pnpm run data:status        # View all data file statuses
pnpm run data:clear         # Clear generated caches
```

## Quick Reference

| Shortcut | Command |
|----------|---------|
| `pnpm run post:new -- "Title"` | `astro-minimax post new "Title"` |
| `pnpm run post:list` | `astro-minimax post list` |
| `pnpm run ai:process` | `astro-minimax ai process` |
| `pnpm run ai:eval` | `astro-minimax ai eval` |
| `pnpm run profile:build` | `astro-minimax profile build` |
| `pnpm run data:status` | `astro-minimax data status` |
