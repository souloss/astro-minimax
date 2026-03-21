---
author: Souloss
pubDatetime: 2026-03-21T00:00:00.000Z
title: astro-minimax 0.8.3
featured: false
category: Release Notes
tags:
  - release
cover: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop"
description: "astro-minimax 0.8.3: Cover image support, settings panel, floating series navigation, preferences system, and more."
---

astro-minimax 0.8.3 is a feature release with significant user experience improvements and new functionality.

## New Features

### Cover Image Support

New `cover` field for blog post cover images, distinguished from `ogImage` (social sharing):

| Field         | Purpose              | Use Case                                                    |
| ------------- | -------------------- | ----------------------------------------------------------- |
| **`cover`**   | Cover image          | Displayed on post cards, article lists, and article banners |
| **`ogImage`** | Social sharing image | Displayed when sharing links on social media                |

**Fallback behavior**:

1. If `cover` is not set but `ogImage` is set → `ogImage` will be used as the cover
2. If neither is set → Dynamic OG image is auto-generated for both scenarios

```yaml
---
title: Post Title
cover: ../../../assets/images/cover.png # Cover for blog display
ogImage: https://example.com/og.png # OG image for social sharing (optional)
---
```

### Settings Panel

Brand new settings panel with rich customization options:

- **Appearance**: Color scheme, border radius, font size
- **Reading**: Font size, line height, content width, reading theme, font family
- **Layout**: Post list layout mode (card/grid/list)
- **General**: Widget visibility, animation effects

Click the settings icon in the bottom-right corner to open the panel.

### Floating Series Navigation

On article detail pages, if the post belongs to a series, a floating navigation appears on the right:

- Shows series name and current progress
- Quick navigation to other posts in the series
- Progress bar indicating reading progress

### Unified PostMeta Component

New `PostMeta` component for consistent metadata display:

- Author, publish date, reading time
- Category and tags
- Multiple display modes (full/compact/article)

### Preferences System

Centralized preferences management system:

- Theme presets (teal, ocean, rose, and more color schemes)
- Local storage persistence
- Share URL functionality (copy settings to share with others)

### Statistics Overview

Added statistics overview sections to archives, categories, series, tags, and friends pages showing total counts.

## Improvements

- **Enhanced i18n**: Improved translation handling, settings panel supports dynamic language switching
- **Header Component**: Improved navigation menu styles, enhanced responsive design and accessibility
- **Page Layouts**: Optimized layouts and visual effects for archives, categories, series, and tags pages
- **TypeScript Types**: Fixed type safety issues in `integration.ts`

## Upgrade Guide

If you're using 0.8.1, simply update dependencies:

```bash
pnpm update @astro-minimax/core @astro-minimax/ai @astro-minimax/cli @astro-minimax/notify
```

## Acknowledgments

Thanks to all contributors and users who provided feedback!
