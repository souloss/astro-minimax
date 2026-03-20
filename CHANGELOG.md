# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.1] - 2026-03-20

### Fixed

- **Mermaid theme adaptation**: Fixed Mermaid diagrams not updating colors when switching between light/dark themes. Diagrams now properly re-render with correct color schemes on theme change.
- **Cloudflare Pages deployment**: Resolved top-level await issue in `functions/api/chat.ts` that caused build failures. Vector index loading is now lazy-loaded on first request.
- **OG image URL path**: Fixed incorrect OG image URL path (`/posts/SLUG/index.png` → `/posts/SLUG.png`) that caused 404 errors when copying share images.
- **OG image QR code URL**: Fixed QR code URLs in dynamically generated OG images to use correct post paths (`/zh/posts/SLUG` instead of file path).
- **Documentation links**: Fixed broken links to color customization documentation throughout the codebase.

### Changed

- Removed misleading "dual version support" phrasing from documentation. Project now consistently uses "Astro v6" terminology.
- Removed `ogImage` fields from several blog posts to enable dynamic OG image generation with QR codes.

## [0.8.0] - 2026-03-17

### Added

- **AI Chat Integration**: Multi-provider support with automatic failover, RAG enhancement, streaming responses, and citation-layered hallucination prevention
- **Article-Aware AI Chat**: Context-aware AI assistant that understands the current article content
- **AI Privacy Protection**: Automatic rejection of sensitive personal information queries
- **AI Quality Evaluation**: Golden test set for automated quality assessment
- **Full i18n Support**: Complete Chinese and English localization
- **Modern Search**: Pagefind integration with optional Algolia DocSearch
- **Dynamic OG Images**: Automatic generation with QR codes using Satori
- **Visualization Components**:
  - Mermaid diagrams with theme support
  - Markmap mind maps
  - Rough.js hand-drawn graphics
  - Excalidraw whiteboard embeds
  - Asciinema terminal playback
- **Notification System**: Telegram Bot, Email (Resend), and Webhook support
- **Waline Comments**: Interactive comment system

### Changed

- Upgraded to Astro v6
- Upgraded to Tailwind v4
- Migrated to TypeScript strict mode
- Migrated to AI SDK v6

### Architecture

- Modular monorepo structure with four independent packages:
  - `@astro-minimax/core`: Core theme, layouts, components, styles
  - `@astro-minimax/ai`: AI integration with multi-provider support
  - `@astro-minimax/notify`: Notification system
  - `@astro-minimax/cli`: Command-line tools

## [0.7.0] - 2025-12-15

### Added

- Initial modular architecture
- Basic blog functionality
- Theme customization options
- Multi-language support foundation

---

For detailed release notes, see:
- [Chinese Release Notes](apps/blog/src/data/blog/zh/_releases/)
- [English Release Notes](apps/blog/src/data/blog/en/_releases/)