import type { AstroIntegration } from "astro";
import { remarkMermaidCodeblock } from "./plugins/remark-mermaid-codeblock";
import { remarkMarkmapCodeblock } from "./plugins/remark-markmap-codeblock";

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

        if (config.mermaid !== false) {
          remarkPlugins.push(remarkMermaidCodeblock);
        }

        if (config.markmap !== false) {
          remarkPlugins.push(remarkMarkmapCodeblock);
        }

        if (remarkPlugins.length > 0) {
          updateConfig({ markdown: { remarkPlugins } });
        }
      },
    },
  };
}
