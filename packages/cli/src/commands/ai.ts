import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL("..", import.meta.url));
const toolsDir = join(__dirname, "tools");

export async function aiCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
AI-powered content processing

Usage:
  astro-minimax ai <subcommand> [options]

Subcommands:
  process           Process posts with AI (summaries + SEO metadata)
  seo               Generate SEO metadata only
  summary           Generate summaries only

Options for "process":
  --force             Reprocess all posts (ignore cache)
  --slug=<slug>       Process only the specified post
  --recent=<n>        Process only recent N posts
  --new-only          Process only posts without existing data
  --dry-run           Preview what would be processed
  --lang=<zh|en>      Process only specified language

Description:
  Processes blog posts to generate AI-powered content:
  - Summaries for search and preview
  - SEO metadata (keywords, descriptions)
  - Caches results to avoid reprocessing

Examples:
  astro-minimax ai process
  astro-minimax ai process --force
  astro-minimax ai process --slug=zh/getting-started
  astro-minimax ai process --recent=5
  astro-minimax ai seo --lang=en
  astro-minimax ai summary
`);
    return;
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  const blogDir = process.cwd();
  const contentDir = join(blogDir, "src", "data", "blog");
  if (!existsSync(contentDir)) {
    console.error("Error: Not in an astro-minimax blog directory.");
    console.error("Run this command from your blog's root directory.");
    process.exit(1);
  }

  const scriptMap: Record<string, { script: string; extraArgs?: string[] }> = {
    process: { script: "ai-process.ts" },
    seo: { script: "ai-process.ts", extraArgs: ["--task=seo"] },
    summary: { script: "ai-process.ts", extraArgs: ["--task=summary"] },
  };

  const config = scriptMap[subcommand];
  if (!config) {
    console.error(`Unknown subcommand: ${subcommand}`);
    console.error("Available: process, seo, summary");
    process.exit(1);
  }

  const toolArgs = [...(config.extraArgs || []), ...subArgs];
  await runTool(config.script, toolArgs, blogDir);
}

async function runTool(script: string, args: string[], cwd: string): Promise<void> {
  const scriptPath = join(toolsDir, script);

  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", scriptPath, ...args], {
      stdio: "inherit",
      shell: true,
      cwd,
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Process exited with code ${code}`));
    });

    child.on("error", reject);
  });
}