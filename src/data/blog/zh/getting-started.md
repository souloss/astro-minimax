---
title: "快速开始：两种使用方式"
pubDatetime: 2026-03-12T00:00:00.000Z
author: Souloss
description: "通过 GitHub Template 一键创建或 NPM 包集成两种方式开始使用 astro-minimax。"
tags:
  - docs
  - configuration
category: 教程/博客
featured: true
draft: false
---

## Table of contents

## 概览

astro-minimax 提供两种使用方式，适合不同场景：

| 方式 | 适合场景 | 更新方式 |
|------|----------|----------|
| **GitHub Template** | 一次性创建，完全自定义 | 手动合并上游更新 |
| **NPM 包集成** | 内容与系统分离，持续获取更新 | `pnpm update` |

---

## 方式一：GitHub Template（推荐新手）

### 1. 创建仓库

点击 GitHub 仓库页面的 **"Use this template"** 按钮，或通过命令行：

```bash
pnpm create astro@latest --template souloss/astro-minimax
```

### 2. 安装依赖

```bash
cd your-blog
pnpm install
```

### 3. 配置

编辑 `src/config.ts`，设置你的博客信息：

```typescript
export const SITE = {
  website: "https://your-domain.com/",
  author: "Your Name",
  title: "My Blog",
  desc: "A personal tech blog",
  // ...
};
```

### 4. 添加内容

将你的文章放到 `src/data/blog/zh/`（中文）或 `src/data/blog/en/`（英文）目录下。

### 5. 开发与部署

```bash
# 本地开发
pnpm run dev

# 构建
pnpm run build

# 预览构建结果
pnpm run preview
```

部署到 Vercel、Cloudflare Pages 或 Netlify — 直接连接 Git 仓库即可自动部署。

### 6. 获取上游更新

```bash
# 添加上游仓库
git remote add upstream https://github.com/souloss/astro-minimax.git

# 拉取更新
git fetch upstream
git merge upstream/main

# 解决冲突后提交
```

---

## 方式二：NPM 包集成

适合希望将内容与主题系统分离的用户。主题核心和可视化插件作为独立 npm 包发布。

### 1. 创建 Astro 项目

```bash
pnpm create astro@latest my-blog
cd my-blog
```

### 2. 安装主题包

```bash
# 核心主题（布局、组件、样式）
pnpm add @astro-minimax/core

# 可视化插件（Mermaid、Markmap、Rough.js 等，可选）
pnpm add @astro-minimax/viz
```

### 3. 配置 Astro

在 `astro.config.ts` 中引入主题的插件：

```typescript
import { remarkMermaidCodeblock } from '@astro-minimax/viz/plugins';
import { remarkMarkmapCodeblock } from '@astro-minimax/viz/plugins';

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkMermaidCodeblock, remarkMarkmapCodeblock],
  },
});
```

### 4. 使用布局和组件

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

### 5. 更新

```bash
pnpm update @astro-minimax/core @astro-minimax/viz
```

---

## 目录结构

无论使用哪种方式，你的博客内容结构保持一致：

```
src/data/blog/
├── zh/                # 中文文章
│   ├── my-post.md
│   └── _examples/     # 示例文章（可删除）
├── en/                # 英文文章
│   ├── my-post.md
│   └── _examples/
```

## 下一步

- [配置主题](/zh/posts/how-to-configure-astro-minimax-theme) — 详细配置指南
- [添加文章](/zh/posts/adding-new-post) — Frontmatter 格式说明
- [自定义配色](/zh/posts/customizing-astro-minimax-theme-color-schemes) — 主题颜色定制
