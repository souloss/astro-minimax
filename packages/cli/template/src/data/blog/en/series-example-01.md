---
title: "Article Series Example - Part 1"
description: "First part of the article series, demonstrating series navigation"
pubDatetime: 2024-01-07T00:00:00.000Z
author: "Your Name"
tags:
  - tutorial
  - series
category: Tutorial/Examples
series:
  name: Article Series Example
  order: 1
---

## About Article Series

astro-minimax supports **article series** functionality, automatically displaying series navigation at the bottom of articles, including progress, previous and next links.

### Series Configuration

Add a `series` field in frontmatter:

```yaml
---
title: "Article Title"
series:
  name: "Series Name"
  order: 1  # Order in the series
---
```

### Features

- Automatic series progress bar
- Shows current article position
- Auto-generates previous/next navigation
- Series page aggregates all articles

---

> **Next**: [Article Series Example - Part 2](/en/posts/series-example-02)