---
title: "系列文章示例 - 第一部分"
description: "这是系列文章的第一篇，演示文章系列导航功能"
pubDatetime: 2024-01-07T00:00:00.000Z
author: "Your Name"
tags:
  - 教程
  - 系列
category: 教程/示例
series:
  name: 系列文章示例
  order: 1
---

## 系列文章说明

astro-minimax 支持**文章系列**功能，可以自动在文章底部显示系列导航，包括当前进度、上一篇和下一篇链接。

### 系列配置

在 frontmatter 中添加 `series` 字段：

```yaml
---
title: "文章标题"
series:
  name: "系列名称"
  order: 1  # 文章在系列中的顺序
---
```

### 功能特性

- 自动显示系列进度条
- 显示当前文章在系列中的位置
- 自动生成上一篇/下一篇导航链接
- 系列页面聚合所有系列文章

---

> **下一篇**: [系列文章示例 - 第二部分](/zh/posts/series-example-02)