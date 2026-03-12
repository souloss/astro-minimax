# astro-minimax

[**English**](./README.en.md) | 简体中文

![astro-minimax](public/astro-minimax-og.jpg)
![Typescript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![GitHub](https://img.shields.io/github/license/souloss/astro-minimax?color=%232F3741&style=for-the-badge)

> **astro-minima-X** — 极简（Minima）为底座，X 代表无限扩展。

astro-minimax 是一个极简、现代化、模块化的 Astro 博客主题。以极简风格为核心，同时提供丰富的可视化组件和功能扩展。支持多语言、AI 聊天、Mermaid 图表、Markmap 思维导图、终端回放等。

## 设计哲学

- **极简优先** — 简洁的设计，内容为核心
- **模块化可插拔** — 核心主题 + 可视化插件分离，按需使用
- **现代化** — Astro v5、Tailwind v4、TypeScript 严格模式
- **内容与系统分离** — 通过 NPM 包或 GitHub Template 灵活集成

## 功能特性

### 核心功能

- [x] 类型安全的 Markdown / MDX
- [x] 极致性能（Lighthouse 90+）
- [x] 无障碍支持
- [x] 响应式设计
- [x] SEO 友好
- [x] 明暗主题切换（View Transitions 动画）
- [x] 全文搜索（Pagefind）
- [x] 动态 OG 图片生成
- [x] 多语言支持（中文/英文）

### 内容增强

- [x] 📊 **Mermaid 图表** — 流程图、时序图等
- [x] 🧠 **Markmap 思维导图** — 交互式思维导图
- [x] ✏️ **Rough.js 手绘图形** — 手绘风格 SVG
- [x] 🖌️ **Excalidraw 嵌入** — 白板风格图表
- [x] 📺 **Asciinema 终端回放** — 嵌入终端录制
- [x] 🤖 **AI 聊天组件** — 内置 AI 助手
- [x] 💬 **Waline 评论** — 互动评论系统
- [x] 🏷️ **分类与系列** — 层级化内容组织

## 两种使用方式

### 方式一：GitHub Template（推荐新手）

```bash
pnpm create astro@latest --template souloss/astro-minimax
cd my-blog && pnpm install && pnpm run dev
```

### 方式二：NPM 包集成

```bash
pnpm add @astro-minimax/core
pnpm add @astro-minimax/viz  # 可选，可视化插件
```

详见 [快速开始指南](src/data/blog/zh/getting-started.md)。

## 项目结构

```bash
/
├── packages/
│   ├── core/          # @astro-minimax/core — 核心主题包
│   └── viz/           # @astro-minimax/viz — 可视化插件包
├── src/
│   ├── components/
│   │   ├── ai/        # AI 聊天组件
│   │   ├── blog/      # 文章组件、目录、评论
│   │   ├── media/     # Mermaid、Markmap、Rough.js、Excalidraw、Asciinema
│   │   ├── nav/       # 页头、页脚、分页
│   │   └── ui/        # 卡片、标签、提示框
│   ├── data/blog/     # 博客文章 (en/, zh/)
│   ├── layouts/       # 布局组件
│   ├── pages/         # 页面路由
│   ├── plugins/       # Remark/Rehype 插件
│   ├── scripts/       # 客户端脚本
│   ├── styles/        # 全局样式
│   └── config.ts      # 主题配置
└── astro.config.ts
```

## 技术栈

**主框架** — [Astro](https://astro.build/)
**样式** — [TailwindCSS](https://tailwindcss.com/)
**搜索** — [Pagefind](https://pagefind.app/)
**评论** — [Waline](https://waline.js.org/)
**图表** — [Mermaid](https://mermaid.js.org/)

## 命令

| 命令 | 操作 |
|------|------|
| `pnpm install` | 安装依赖 |
| `pnpm run dev` | 启动开发服务器 |
| `pnpm run build` | 构建生产站点 |
| `pnpm run preview` | 预览构建结果 |
| `pnpm run lint` | 代码检查 |
| `pnpm run format` | 代码格式化 |

## 文档

- [快速开始](src/data/blog/zh/getting-started.md)
- [主题配置](src/data/blog/zh/how-to-configure-astro-minimax-theme.md)
- [添加文章](src/data/blog/zh/adding-new-post.md)
- [自定义配色](src/data/blog/zh/customizing-astro-minimax-theme-color-schemes.md)
- [动态 OG 图片](src/data/blog/zh/dynamic-og-images.md)

## 致谢

基于 [AstroPaper](https://github.com/satnaing/astro-paper) 二次开发。

## 许可证

MIT License - Copyright © 2025

---

由 [Souloss](https://souloss.cn) 用心打造。
