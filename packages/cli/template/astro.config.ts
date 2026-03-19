import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import minimax from "@astro-minimax/core";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";

import remarkMath from "remark-math";
import remarkGithubAlerts from "remark-github-alerts";
import remarkEmoji from "remark-emoji";
import rehypeKatex from "rehype-katex";
import { remarkReadingTime } from "@astro-minimax/core/plugins/remark-reading-time";
import { remarkAddZoomable } from "@astro-minimax/core/plugins/remark-add-zoomable";
import { rehypeExternalLinks } from "@astro-minimax/core/plugins/rehype-external-links";
import { rehypeTableScroll } from "@astro-minimax/core/plugins/rehype-table-scroll";
import { rehypeAutolinkHeadings } from "@astro-minimax/core/plugins/rehype-autolink-headings";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import {
  updateStyle,
  addTitle,
  addLanguage,
  addCopyButton,
  addCollapse,
} from "@astro-minimax/core/plugins/shiki-transformers";
import { SITE } from "./src/config";
import { SOCIALS, SHARE_LINKS } from "./src/constants";
import { FRIENDS } from "./src/data/friends";

// Shiki transformers require type casting since they use a different type system
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asTransformer = (t: any) => t;

const shikiTransformers = [
  asTransformer(updateStyle()),
  asTransformer(addTitle()),
  asTransformer(addLanguage()),
  asTransformer(addCopyButton(2000)),
  asTransformer(addCollapse(15)),
  transformerNotationHighlight(),
  transformerNotationWordHighlight(),
  transformerNotationDiff({ matchAlgorithm: "v3" }),
];

export default defineConfig({
  site: SITE.website,
  output: "static",
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  integrations: [
    minimax({
      site: SITE,
      socials: SOCIALS,
      shareLinks: SHARE_LINKS,
      friends: FRIENDS,
      blogPath: "src/data/blog",
      viz: { mermaid: true, markmap: true },
    }),
    preact({
      compat: true,
    }),
    sitemap({
      filter: page => SITE.showArchives || !page.endsWith("/archives"),
    }),
    mdx({
      shikiConfig: {
        themes: { light: "github-light", dark: "night-owl" },
        defaultColor: false,
        wrap: false,
        transformers: shikiTransformers,
      },
    }),
  ],
  markdown: {
    remarkPlugins: [
      remarkMath,
      remarkGithubAlerts,
      remarkEmoji,
      remarkReadingTime,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [remarkAddZoomable as any, { className: "zoomable" }],
    ],
    rehypePlugins: [
      rehypeKatex,
      rehypeExternalLinks,
      rehypeTableScroll,
      rehypeAutolinkHeadings,
    ],
    shikiConfig: {
      themes: { light: "github-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: shikiTransformers,
    },
  },
  vite: {
    plugins: [
      tailwindcss() as never,
    ],
    server: {
      fs: {
        strict: true,
        allow: ["./src", "./.astro"],
      },
      proxy: {
        "/api": {
          target: `http://localhost:${process.env.AI_DEV_PORT || "8787"}`,
          changeOrigin: true,
        },
      },
      warmup: {
        clientFiles: [
          "./src/components/**/*.astro",
          "./src/layouts/**/*.astro",
        ],
      },
    },
    resolve: {
      alias: {
        "@/" : new URL("./src/", import.meta.url).pathname,
        "react": "preact/compat",
        "react-dom": "preact/compat",
        "react/jsx-runtime": "preact/jsx-runtime",
      },
      dedupe: ["preact", "preact/hooks", "preact/compat", "preact/debug", "preact/devtools", "react", "react-dom"],
    },
    // Pre-bundle dependencies to speed up development and ensure consistency.
    //
    // WHY: By explicitly including these packages in optimizeDeps, Vite pre-bundles
    // them on startup. This prevents lazy-loading race conditions where modules
    // might load from different copies during dev. Particularly important for
    // @ai-sdk/react which uses hooks that must resolve consistently.
    //
    // NOTE: Local workspace packages (@astro-minimax/*) are excluded from optimization
    // because they're linked via workspace protocol and should be loaded fresh on changes.
    // Excluding them also ensures JSX transformation uses Preact's jsx-runtime correctly.
    optimizeDeps: {
      noDiscovery: true,
      exclude: ["@resvg/resvg-js", "@astro-minimax/ai", "@astro-minimax/core"],
      include: [
        "preact",
        "preact/hooks",
        "preact/compat",
        "preact/debug",
        "preact/devtools",
        "preact/jsx-runtime",
        "preact/jsx-dev-runtime",
        "@ai-sdk/react",
        "ai",
        "mermaid",
        "markmap-lib",
        "katex",
      ],
    },
    ssr: {
      external: ["@resvg/resvg-js", "sharp"],
      noExternal: [
        "@astro-minimax/ai",
        "@astro-minimax/core",
        "@ai-sdk/react",
        "ai",
      ],
    },
    build: {
      rollupOptions: {
        external: [/@resvg\/resvg-js/, /@resvg\/resvg-js-linux-.*/, /\.node$/],
      },
      cssMinify: true,
      minify: "esbuild",
      sourcemap: false,
      reportCompressedSize: true,
    },
    environments: {
      client: {
        build: {
          rollupOptions: {
            output: {
              chunkFileNames: "assets/[name]-[hash].js",
              entryFileNames: "assets/[name]-[hash].js",
              assetFileNames: "assets/[name]-[hash].[ext]",
            },
          },
        },
      },
    },
  },
  image: {
    responsiveStyles: true,
    layout: "constrained",
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
});