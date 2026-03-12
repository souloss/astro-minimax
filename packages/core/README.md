# @astro-minimax/core

Core theme package for [astro-minimax](https://github.com/souloss/astro-minimax).

Includes layouts, navigation components, blog components, UI components, social components, styles, utilities, and remark/rehype plugins.

## Installation

```bash
pnpm add @astro-minimax/core
```

## Usage

```astro
---
import Layout from '@astro-minimax/core/layouts/Layout.astro';
import Header from '@astro-minimax/core/components/nav/Header.astro';
import Footer from '@astro-minimax/core/components/nav/Footer.astro';
---

<Layout title="My Page">
  <Header />
  <main><slot /></main>
  <Footer />
</Layout>
```

See the [documentation](https://github.com/souloss/astro-minimax) for full usage details.
