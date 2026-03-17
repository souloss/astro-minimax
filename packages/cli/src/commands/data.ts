import { existsSync, readdirSync, readFileSync, unlinkSync, rmSync } from "node:fs";
import { join } from "node:path";

export async function dataCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Data status and management

Usage:
  astro-minimax data <subcommand>

Subcommands:
  status            Show data files status
  clear             Clear all generated data caches

Description:
  View and manage the generated data files in datas/ directory:
  - AI summaries and SEO metadata
  - Author profiles and contexts
  - Voice profiles
  - Skip lists

Examples:
  astro-minimax data status
  astro-minimax data clear
`);
    return;
  }

  const subcommand = args[0];

  const datasDir = join(process.cwd(), "datas");
  if (!existsSync(datasDir)) {
    console.error("Error: Not in an astro-minimax blog directory.");
    process.exit(1);
  }

  switch (subcommand) {
    case "status":
      showStatus(datasDir);
      break;
    case "clear":
      await clearData(datasDir);
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.error("Available: status, clear");
      process.exit(1);
  }
}

function showStatus(datasDir: string): void {
  console.log("\n  Data Files Status:\n");

  const files = [
    { name: "ai-summaries.json", desc: "AI-generated summaries" },
    { name: "ai-seo.json", desc: "SEO metadata" },
    { name: "ai-skip-list.json", desc: "Skipped posts list" },
    { name: "author-context.json", desc: "Author context" },
    { name: "author-profile-context.json", desc: "Profile context" },
    { name: "author-profile-report.json", desc: "Profile report" },
    { name: "voice-profile.json", desc: "Writing style profile" },
  ];

  for (const file of files) {
    const path = join(datasDir, file.name);
    if (existsSync(path)) {
      const content = readFileSync(path, "utf-8");
      const stat = JSON.parse(content);
      const articles = stat.articles ? Object.keys(stat.articles).length : 0;
      const posts = stat.posts ? stat.posts.length : 0;
      const updated = stat.meta?.lastUpdated || stat.generatedAt || "never";

      console.log(`  ✅ ${file.name}`);
      console.log(`     ${file.desc}`);
      if (articles > 0) console.log(`     ${articles} articles processed`);
      if (posts > 0) console.log(`     ${posts} posts analyzed`);
      console.log(`     Last updated: ${updated}`);
      console.log();
    } else {
      console.log(`  ⬜ ${file.name}`);
      console.log(`     ${file.desc} - not generated`);
      console.log();
    }
  }
}

async function clearData(datasDir: string): Promise<void> {
  const clearableFiles = [
    "ai-summaries.json",
    "ai-seo.json",
    "ai-skip-list.json",
    "author-context.json",
    "author-profile-context.json",
    "author-profile-report.json",
    "voice-profile.json",
  ];

  console.log("\n  Clearing generated data...\n");

  let cleared = 0;
  for (const file of clearableFiles) {
    const path = join(datasDir, file);
    if (existsSync(path)) {
      unlinkSync(path);
      console.log(`  ✓ Removed ${file}`);
      cleared++;
    }
  }

  const sourcesDir = join(datasDir, "sources", "blog-digest.json");
  if (existsSync(sourcesDir)) {
    unlinkSync(sourcesDir);
    console.log(`  ✓ Removed sources/blog-digest.json`);
    cleared++;
  }

  console.log(`\n  Cleared ${cleared} file(s).\n`);
  console.log("  Run 'astro-minimax ai process' to regenerate.\n");
}