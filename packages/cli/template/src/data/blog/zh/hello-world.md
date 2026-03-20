---
title: "你好，世界"
description: "这是我的第一篇博客文章，由 astro-minimax 主题驱动。"
pubDatetime: 2026-01-01T00:00:00.000Z
author: "Your Name"
# draft: false       # Optional: Set true to hide from production
# featured: false    # Optional: Set true to feature on homepage
tags:
  - 入门
category: 教程/入门
# series:            # Optional: Article series configuration
#   name: "Getting Started Series"
#   order: 1
---

## 欢迎来到我的博客

这是使用 [astro-minimax](https://github.com/souloss/astro-minimax) 主题创建的第一篇文章。

### 开始写作

在 `src/data/blog/zh/` 目录下创建 `.md` 或 `.mdx` 文件即可发布新文章。

每篇文章需要以下 frontmatter：

```yaml
---
title: "文章标题"
description: "文章描述"
pubDatetime: 2026-01-01T00:00:00.000Z
author: "作者名称"
tags:
  - 标签名
category: 分类/子分类
---
```

### 可选字段

```yaml
# draft: false         # 设为 true 可隐藏文章
# featured: false      # 设为 true 可在首页突出显示
# modDatetime: ...     # 最后修改时间
# series:              # 系列文章配置
#   name: "系列名称"
#   order: 1
```

### 自定义主题

编辑 `src/config.ts` 来自定义博客：

```typescript
SITE: {
  title: "我的博客",
  author: "Your Name",
  desc: "博客描述",
  // 功能开关
  features: {
    tags: true,       # 标签页
    categories: true, # 分类页
    series: true,     # 系列页
    archives: true,   # 归档页
    search: true,     # 搜索页
  },
  darkMode: true,     # 暗色模式
}
```

### 内置功能

- ✅ **Markdown 扩展** - 数学公式、代码高亮、GitHub Alerts
- ✅ **可视化** - Mermaid 图表、Markmap 思维导图
- ✅ **SEO 优化** - 自动生成 sitemap、RSS、Open Graph
- ✅ **多语言** - 支持中英文双语
- ✅ **暗色模式** - 自动跟随系统或手动切换

祝你写作愉快！