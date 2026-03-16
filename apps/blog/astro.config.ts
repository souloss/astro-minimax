import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import minimax from "@astro-minimax/core";
import minimaxViz from "@astro-minimax/viz";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
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
    }),
    minimaxViz({ mermaid: true, markmap: true }),
    preact({ compat: true }),
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
      remarkToc,
      [remarkCollapse, { test: "Table of contents" }],
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
      {
        name: "astro-minimax-preact-singleton",
        enforce: "pre" as const,
        async resolveId(source, importer, options) {
          if (source.startsWith("@/components/media")) {
            const vizDir = new URL("../../packages/viz/src/components", import.meta.url).pathname;
            return this.resolve(source.replace("@/components/media", vizDir), importer, { ...options, skipSelf: true });
          }
        },
      },
    ],
    server: {
      fs: {
        strict: true,
        allow: [
          // Allow serving files from workspace packages
          new URL("../../packages", import.meta.url).pathname,
          new URL("../../node_modules", import.meta.url).pathname,
          "./src",
          "./.astro",
        ],
      },
      proxy: {
        "/api": {
          target: `http://localhost:${process.env.AI_DEV_PORT || "8787"}`,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        "@/components/media": new URL("../../packages/viz/src/components", import.meta.url).pathname,
        "@/" : new URL("./src/", import.meta.url).pathname,
        "react": "preact/compat",
        "react-dom": "preact/compat",
        "react/jsx-runtime": "preact/jsx-runtime",
      },
      // Ensure single Preact instance to fix __H undefined hydration error with @ai-sdk/react
      dedupe: ["preact", "preact/hooks", "preact/compat", "preact/debug", "preact/devtools", "react", "react-dom"],
    },
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
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
        "@astro-minimax/ai",
        "@astro-minimax/core",
        "@astro-minimax/viz",
      ],
    },
    ssr: {
      external: ["@resvg/resvg-js", "sharp"],
      noExternal: [
        "@astro-minimax/ai",
        "@astro-minimax/core",
        "@astro-minimax/viz",
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
