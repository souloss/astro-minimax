import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/data/blog" }),
  schema: ({ image }) =>
    z.object({
      author: z.string().optional(),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      category: z.string().optional(),
      ogImage: z
        .union([image(), z.string()])
        .optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      timezone: z.string().optional(),
      series: z.string().optional(),
    }),
});

export const collections = { blog };
