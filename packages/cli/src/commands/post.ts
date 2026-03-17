import { existsSync } from "node:fs";
import { join } from "node:path";

export async function postCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Manage blog posts

Usage:
  astro-minimax post <subcommand> [options]

Subcommands:
  new <title>       Create a new blog post
  list              List all posts
  stats             Show post statistics

Options for "new":
  --lang=<zh|en>        Post language (default: zh)
  --category=<path>     Category path (e.g., "Tutorial/Frontend")

Description:
  The "new" subcommand creates a markdown file with proper frontmatter
  in the correct language directory (src/data/blog/<lang>/).

Examples:
  astro-minimax post new "Hello World"
  astro-minimax post new "Getting Started" --lang=en
  astro-minimax post new "Tutorial" --category="Tutorial/Frontend"
  astro-minimax post list
  astro-minimax post stats
`);
    return;
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  const contentDir = join(process.cwd(), "src", "data", "blog");
  if (!existsSync(contentDir)) {
    console.error("Error: Not in an astro-minimax blog directory.");
    console.error("Run this command from your blog's root directory.");
    process.exit(1);
  }

  switch (subcommand) {
    case "new":
      await createNewPost(subArgs);
      break;
    case "list":
      await listPosts();
      break;
    case "stats":
      await showStats();
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.error("Available: new, list, stats");
      process.exit(1);
  }
}

async function createNewPost(args: string[]): Promise<void> {
  if (args.length === 0 || args[0].startsWith("--")) {
    console.error("Error: Post title is required.");
    console.error('Usage: astro-minimax post new "<title>"');
    process.exit(1);
  }

  const title = args.find((a) => !a.startsWith("--")) || "";
  const langArg = args.find((a) => a.startsWith("--lang="));
  const categoryArg = args.find((a) => a.startsWith("--category="));

  const lang = langArg ? langArg.split("=")[1] : "zh";
  const category = categoryArg ? categoryArg.split("=")[1] : "Blog";

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "");

  const date = new Date().toISOString().split("T")[0];
  const frontmatter = `---
title: "${title}"
date: ${date}
updated: ${date}
categories:
  - ${category}
tags:
  - draft
---

# ${title}

Write your content here...
`;

  const { writeFile, mkdir } = await import("node:fs/promises");
  const postDir = join(process.cwd(), "src", "data", "blog", lang);
  const postPath = join(postDir, `${slug}.md`);

  await mkdir(postDir, { recursive: true });
  await writeFile(postPath, frontmatter);

  console.log(`\n  ✅ Created: ${postPath}\n`);
  console.log(`  Title:    ${title}`);
  console.log(`  Language: ${lang}`);
  console.log(`  Category: ${category}\n`);
}

async function listPosts(): Promise<void> {
  const { readdir, readFile } = await import("node:fs/promises");
  const zhDir = join(process.cwd(), "src", "data", "blog", "zh");
  const enDir = join(process.cwd(), "src", "data", "blog", "en");

  console.log("\n  Blog Posts:\n");

  for (const [lang, dir] of [
    ["zh", zhDir],
    ["en", enDir],
  ]) {
    if (!existsSync(dir)) continue;

    const files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
    console.log(`  [${lang.toUpperCase()}] ${files.length} posts`);

    for (const file of files.slice(0, 5)) {
      const content = await readFile(join(dir, file), "utf-8");
      const titleMatch = content.match(/title:\s*["'](.+?)["']/);
      const title = titleMatch ? titleMatch[1] : file;
      console.log(`    • ${title}`);
    }
    if (files.length > 5) {
      console.log(`    ... and ${files.length - 5} more`);
    }
    console.log();
  }
}

async function showStats(): Promise<void> {
  const { readdir } = await import("node:fs/promises");
  const zhDir = join(process.cwd(), "src", "data", "blog", "zh");
  const enDir = join(process.cwd(), "src", "data", "blog", "en");

  const zhCount = existsSync(zhDir)
    ? (await readdir(zhDir)).filter((f) => f.endsWith(".md")).length
    : 0;
  const enCount = existsSync(enDir)
    ? (await readdir(enDir)).filter((f) => f.endsWith(".md")).length
    : 0;

  console.log("\n  Post Statistics:\n");
  console.log(`  Chinese (zh):  ${zhCount}`);
  console.log(`  English (en):  ${enCount}`);
  console.log(`  Total:         ${zhCount + enCount}\n`);
}