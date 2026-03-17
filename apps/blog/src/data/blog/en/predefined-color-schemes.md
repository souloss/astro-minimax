---
author: Souloss
pubDatetime: 2022-09-26T12:13:24Z
modDatetime: 2026-03-17T20:44:00Z
title: Predefined color schemes
slug: predefined-color-schemes
featured: false
draft: false
category: 教程/配置
tags:
  - color-schemes
description:
  Some of the well-crafted, predefined color schemes for astro-minimax blog
  theme.
---

I've crafted some predefined color schemes for this astro-minimax blog theme. You can replace these color schemes with the original ones.

If you don't know how you can configure color schemes, check [this blog post](/en/posts/customizing-astro-minimax-theme-color-schemes/).

## Light color schemes

Light color scheme has to be defined using the css selector `:root` and `html[data-theme="light"]`.

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

## Dark color schemes

Dark color scheme has to be defined as `html[data-theme="dark"]`.

### astro-minimax 1 original Dark Theme

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

### Astro dark (High Contrast)

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

### Astro dark (New default dark theme in astro-minimax 2)

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

### Astro Deep Purple (New dark theme in astro-minimax 3)

<!-- See the online demo site for a preview of this color scheme -->

```css
html[data-theme="dark"] {
  --background: #212737;
  --foreground: #eaedf3;
  --accent: #eb3fd3;
  --muted: #7d4f7c;
  --border: #642451;
}
```

### Special Dark Theme

<!-- See the online demo site for a preview of this color scheme -->

```css
html[data-theme="dark"] {
  --background: #000123;
  --accent: #617bff;
  --foreground: #eaedf3;
  --muted: #0c0e4f;
  --border: #303f8a;
}
```
