# @astro-minimax/viz

Visualization plugin package for [astro-minimax](https://github.com/souloss/astro-minimax).

Includes components and remark plugins for Mermaid diagrams, Markmap mind maps, Rough.js hand-drawn graphics, Excalidraw whiteboards, Asciinema terminal replay, and more.

## Installation

```bash
pnpm add @astro-minimax/viz
```

## Usage

### Remark Plugins

```typescript
// astro.config.ts
import { remarkMermaidCodeblock, remarkMarkmapCodeblock } from '@astro-minimax/viz/plugins';

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkMermaidCodeblock, remarkMarkmapCodeblock],
  },
});
```

### Components (MDX)

```mdx
import Mermaid from '@astro-minimax/viz/components/Mermaid.astro';
import RoughDrawing from '@astro-minimax/viz/components/RoughDrawing.astro';
import AsciinemaPlayer from '@astro-minimax/viz/components/AsciinemaPlayer.astro';

<Mermaid code="graph TD; A-->B;" />
<AsciinemaPlayer src="/casts/demo.cast" />
```

See the [documentation](https://github.com/souloss/astro-minimax) for full usage details.
