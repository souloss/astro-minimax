import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export async function aiCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
AI-powered content processing

Usage:
  astro-minimax ai <subcommand> [options]

Subcommands:
  process         Process blog posts with AI (summaries, SEO, etc.)
  vectorize       Generate vector embeddings for search
  seo             Generate SEO metadata only
  summary         Generate summaries only

Options for 'process':
  --force           Force reprocess all posts
  --slug=<slug>     Process only specified post
  --recent=<n>      Process only recent N posts
  --new-only        Process only posts without cache
  --dry-run         Show what would be processed
  --lang=<zh|en>    Process only specified language

Examples:
  astro-minimax ai process
  astro-minimax ai process --force
  astro-minimax ai process --slug=zh/getting-started
  astro-minimax ai process --recent=10
  astro-minimax ai vectorize
`);
    return;
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  const toolsDir = join(process.cwd(), "tools");
  if (!existsSync(toolsDir)) {
    console.error("Error: Not in an astro-minimax blog directory.");
    console.error("Run this command from your blog's root directory.");
    process.exit(1);
  }

  const scriptMap: Record<string, string> = {
    process: "ai-process.ts",
    vectorize: "vectorize.ts",
    seo: "ai-process.ts",
    summary: "ai-process.ts",
  };

  const script = scriptMap[subcommand];
  if (!script) {
    console.error(`Unknown AI subcommand: ${subcommand}`);
    console.error("Run 'astro-minimax ai --help' for usage.");
    process.exit(1);
  }

  let toolArgs = subArgs;
  if (subcommand === "seo") {
    toolArgs = ["--task=seo", ...subArgs];
  } else if (subcommand === "summary") {
    toolArgs = ["--task=summary", ...subArgs];
  }

  await runTool(script, toolArgs);
}

async function runTool(script: string, args: string[]): Promise<void> {
  const scriptPath = join(process.cwd(), "tools", script);
  
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", scriptPath, ...args], {
      stdio: "inherit",
      shell: true,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Tool exited with code ${code}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}