import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import remarkMath from "remark-math";
import remarkGithubAlerts from "remark-github-alerts";
import remarkEmoji from "remark-emoji";
import rehypeKatex from "rehype-katex";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
// 临时注释掉，看是否是这里的问题
// import { transformerFileName } from "./src/utils/transformers/fileName";
import { SITE } from "./src/config";

export default defineConfig({
  site: SITE.website,
  output: "static",
  integrations: [
    sitemap({
      filter: page => SITE.showArchives || !page.endsWith("/archives"),
      xhtml: false,
    }),
    mdx({
      shikiConfig: {
        themes: { light: "github-light", dark: "night-owl" },
        defaultColor: false,
        wrap: false,
        transformers: [
          // 临时移除自定义 transformer
          // transformerFileName({ style: "v2", hideDot: false }),
          transformerNotationHighlight(),
          transformerNotationWordHighlight(),
          transformerNotationDiff({ matchAlgorithm: "v3" }),
        ],
      },
    }),
  ],
  markdown: {
    remarkPlugins: [
      remarkToc,
      [remarkCollapse, { test: "Table of contents" }],
      remarkMath,
      remarkGithubAlerts,
      remarkEmoji,
    ],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      themes: { light: "github-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        // transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js", "sharp"],
    },
    ssr: {
      external: ["@resvg/resvg-js", "sharp"],
    },
    build: {
      rollupOptions: {
        external: ["@resvg/resvg-js", "sharp"],
      },
    },
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/noop',
    },
  },
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    preserveScriptOrder: true,
  },
});