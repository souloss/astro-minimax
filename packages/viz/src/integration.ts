import type { AstroIntegration } from "astro";
import { remarkMermaidCodeblock } from "./plugins/remark-mermaid-codeblock";
import { remarkMarkmapCodeblock } from "./plugins/remark-markmap-codeblock";
import { rehypeMermaidProcessed } from "./plugins/rehype-mermaid-processed";

export interface VizConfig {
  mermaid?: boolean;
  markmap?: boolean;
}

export default function minimaxViz(config: VizConfig = {}): AstroIntegration {
  return {
    name: "@astro-minimax/viz",
    hooks: {
      "astro:config:setup": ({ updateConfig }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const remarkPlugins: any[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rehypePlugins: any[] = [];

        if (config.mermaid !== false) {
          remarkPlugins.push(remarkMermaidCodeblock);
          rehypePlugins.push(rehypeMermaidProcessed);
        }

        if (config.markmap !== false) {
          remarkPlugins.push(remarkMarkmapCodeblock);
        }

        updateConfig({
          markdown: { remarkPlugins },
        });
        
        if (rehypePlugins.length > 0) {
          updateConfig({ markdown: { rehypePlugins } });
        }
      },
    },
  };
}
