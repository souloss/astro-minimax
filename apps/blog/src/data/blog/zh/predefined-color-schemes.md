---
author: Souloss
pubDatetime: 2022-09-26T12:13:24Z
modDatetime: 2026-03-17T20:44:00Z
title: 预定义配色方案
featured: false
draft: false
category: 教程/配置
tags:
  - color-schemes
description: 为 astro-minimax 博客主题精心设计的一些预定义配色方案。
---

我为 astro-minimax 博客主题设计了一些预定义配色方案。你可以用这些配色方案替换原有的配色。

如果你不知道如何配置配色方案，请查看[这篇博客文章](/zh/posts/customizing-astro-minimax-theme-color-schemes/)。

## 浅色配色方案

浅色配色方案必须使用 CSS 选择器 `:root` 和 `html[data-theme="light"]` 来定义。

### Lobster

![lobster-color-scheme](/images/color-scheme-lobster.png)

```css
:root,
html[data-theme="light"] {
  --background: #f6eee1;
  --foreground: #012c56;
  --accent: #e14a39;
  --muted: #efd8b0;
  --border: #dc9891;
}
```

### Leaf Blue

![leaf-blue-color-scheme](/images/color-scheme-leaf-blue.png)

```css
:root,
html[data-theme="light"] {
  --background: #f2f5ec;
  --foreground: #353538;
  --accent: #1158d1;
  --muted: #bbc789;
  --border: #7cadff;
}
```

### Pinky light

![pinky-color-scheme](/images/color-scheme-pinky.png)

```css
:root,
html[data-theme="light"] {
  --background: #fafcfc;
  --foreground: #222e36;
  --accent: #d3006a;
  --muted: #f1bad4;
  --border: #e3a9c6;
}
```

## 深色配色方案

深色配色方案必须定义为 `html[data-theme="dark"]`。

### astro-minimax 1 原始深色主题

![astro-minimax 1 default dark theme](/images/color-scheme-astro-minimax1-dark.png)

```css
html[data-theme="dark"] {
  --background: #2f3741;
  --foreground: #e6e6e6;
  --accent: #1ad9d9;
  --muted: #596b81;
  --border: #3b4655;
}
```

### Deep Oyster

![deep-oyster-color-scheme](/images/color-scheme-deep-oyster.png)

```css
html[data-theme="dark"] {
  --background: #21233d;
  --foreground: #f4f7f5;
  --accent: #ff5256;
  --muted: #4a4e86;
  --border: #b12f32;
}
```

### Pikky dark

![pinky-dark-color-scheme](/images/color-scheme-pinky-dark.png)

```css
html[data-theme="dark"] {
  --background: #353640;
  --foreground: #e9edf1;
  --accent: #ff78c8;
  --muted: #715566;
  --border: #86436b;
}
```

### Astro dark (高对比度)

![astro-dark-color-scheme](/images/color-scheme-astro-dark.png)

```css
html[data-theme="dark"] {
  --background: #212737;
  --foreground: #eaedf3;
  --accent: #ff6b01;
  --muted: #8a3302;
  --border: #ab4b08;
}
```

### Astro dark (astro-minimax 2 新默认深色主题)

![new dark color scheme - low contrast](/images/color-scheme-astro-dark-low-contrast.png)

```css
html[data-theme="dark"] {
  --background: #212737; /* lower contrast background */
  --foreground: #eaedf3;
  --accent: #ff6b01;
  --muted: #8a3302;
  --border: #ab4b08;
}
```

### Astro Deep Purple (astro-minimax 3 新深色主题)

<!-- 此配色方案的预览请参考在线演示站 -->

```css
html[data-theme="dark"] {
  --background: #212737;
  --foreground: #eaedf3;
  --accent: #eb3fd3;
  --muted: #7d4f7c;
  --border: #642451;
}
```

### 特别版深色主题

<!-- 此配色方案的预览请参考在线演示站 -->

```css
html[data-theme="dark"] {
  --background: #000123;
  --accent: #617bff;
  --foreground: #eaedf3;
  --muted: #0c0e4f;
  --border: #303f8a;
}
```
