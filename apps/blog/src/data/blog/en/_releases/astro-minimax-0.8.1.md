---
author: Souloss
pubDatetime: 2026-03-20T00:00:00.000Z
title: astro-minimax 0.8.1
featured: false
category: Release Notes
tags:
  - release
cover: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop"
description: "astro-minimax 0.8.1: Bug fixes for Mermaid theme adaptation, Cloudflare Pages deployment, and OG image paths."
---

astro-minimax 0.8.1 is a maintenance release that fixes several issues discovered in 0.8.0.

## Bug Fixes

### Mermaid Theme Adaptation

Fixed an issue where Mermaid diagrams wouldn't update colors when switching between light/dark themes. Diagrams now correctly re-render with the appropriate color scheme on theme change.

**Impact**: All blog pages using Mermaid diagrams

### Cloudflare Pages Deployment

Fixed a build failure caused by top-level `await` in `functions/api/chat.ts`. Vector index loading is now lazy-loaded, initializing only on first request.

**Impact**: All users deploying to Cloudflare Pages

### OG Image Paths

Fixed incorrect path for dynamically generated OG images (`/posts/SLUG/index.png` → `/posts/SLUG.png`), resolving 404 errors when copying share images.

**Impact**: All articles using dynamic OG images

### OG Image QR Code URLs

Fixed QR codes in OG images pointing to incorrect URLs (file paths instead of article paths). QR codes now correctly point to `/zh/posts/SLUG` or `/en/posts/SLUG`.

**Impact**: All dynamically generated OG images

### Documentation Links

Fixed multiple broken links pointing to a non-existent color customization document.

## Changes

- Removed misleading "dual version support" phrasing from documentation, consistently using "Astro v6"
- Removed `ogImage` fields from several posts to enable dynamic OG image generation with QR codes

## Upgrade Guide

If you're using 0.8.0, simply update dependencies:

```bash
pnpm update @astro-minimax/core @astro-minimax/ai @astro-minimax/cli @astro-minimax/notify
```

## Acknowledgments

Thanks to all users who reported issues!