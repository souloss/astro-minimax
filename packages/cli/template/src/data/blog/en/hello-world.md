---
title: "Hello, World"
description: "This is my first blog post, powered by the astro-minimax theme."
pubDatetime: 2026-01-01T00:00:00.000Z
author: "Your Name"
# draft: false       # Optional: Set true to hide from production
# featured: false    # Optional: Set true to feature on homepage
tags:
  - getting-started
category: Tutorial/Getting Started
# series:            # Optional: Article series configuration
#   name: "Getting Started Series"
#   order: 1
---

## Welcome to My Blog

This is the first post created using the [astro-minimax](https://github.com/souloss/astro-minimax) theme.

### Start Writing

Create `.md` or `.mdx` files in the `src/data/blog/en/` directory to publish new articles.

Each article requires the following frontmatter:

```yaml
---
title: "Article Title"
description: "Article description"
pubDatetime: 2026-01-01T00:00:00.000Z
author: "Author Name"
tags:
  - tag-name
category: Category/Subcategory
---
```

### Optional Fields

```yaml
# draft: false         # Set true to hide the article
# featured: false      # Set true to feature on homepage
# modDatetime: ...     # Last modified time
# series:              # Article series configuration
#   name: "Series Name"
#   order: 1
```

### Customize the Theme

Edit `src/config.ts` to customize your blog:

```typescript
SITE: {
  title: "My Blog",
  author: "Your Name",
  desc: "Blog description",
  // Feature toggles
  features: {
    tags: true,       // Tags page
    categories: true, // Categories page
    series: true,     // Series page
    archives: true,   // Archives page
    search: true,     // Search page
  },
  darkMode: true,     // Dark mode
}
```

### Built-in Features

- ✅ **Markdown Extensions** - Math formulas, code highlighting, GitHub Alerts
- ✅ **Visualization** - Mermaid diagrams, Markmap mind maps
- ✅ **SEO Optimization** - Auto-generated sitemap, RSS, Open Graph
- ✅ **Multi-language** - Chinese and English support
- ✅ **Dark Mode** - Auto-follow system or manual toggle

Happy writing!