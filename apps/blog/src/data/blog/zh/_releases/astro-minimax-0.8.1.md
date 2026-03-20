---
author: Souloss
pubDatetime: 2026-03-20T00:00:00.000Z
title: astro-minimax 0.8.1
featured: false
category: 发布说明
tags:
  - release
description: "astro-minimax 0.8.1: 修复 Mermaid 主题适配、Cloudflare Pages 部署问题、OG 图片路径等关键问题。"
---

astro-minimax 0.8.1 是一个维护版本，修复了 0.8.0 中发现的若干问题。

## 修复的问题

### Mermaid 图表主题适配

修复了 Mermaid 图表在明暗主题切换时不会更新颜色的问题。现在图表会正确地随主题切换重新渲染，使用对应的配色方案。

**影响**：所有使用 Mermaid 图表的博客页面

### Cloudflare Pages 部署

修复了 `functions/api/chat.ts` 中的顶层 `await` 导致 Cloudflare Pages 构建失败的问题。向量索引加载改为延迟加载，仅在首次请求时初始化。

**影响**：所有部署到 Cloudflare Pages 的用户

### OG 图片路径

修复了动态生成的 OG 图片路径错误（`/posts/SLUG/index.png` → `/posts/SLUG.png`），解决了复制分享图时 404 的问题。

**影响**：所有使用动态 OG 图片的文章

### OG 图片二维码 URL

修复了 OG 图片中二维码指向错误的 URL（文件路径而非文章路径）。现在二维码正确指向 `/zh/posts/SLUG` 或 `/en/posts/SLUG`。

**影响**：所有动态生成的 OG 图片

### 文档链接

修复了文档中多处指向不存在的「自定义配色」文档的断链。

## 变更

- 移除了文档中具有误导性的「双版本支持」表述，统一使用「Astro v6」
- 移除了几篇文章的 `ogImage` 字段，以启用带二维码的动态 OG 图片生成

## 升级指南

如果你使用的是 0.8.0，只需更新依赖：

```bash
pnpm update @astro-minimax/core @astro-minimax/ai @astro-minimax/cli @astro-minimax/notify
```

## 致谢

感谢所有反馈问题的用户！