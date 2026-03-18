import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL("..", import.meta.url));
const toolsDir = join(__dirname, "tools");

export async function podcastCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Generate AI podcasts from blog posts

Usage:
  astro-minimax podcast <subcommand> [options]

Subcommands:
  generate           Generate podcasts from blog posts
  list               List generated podcasts
  feed               Generate podcast RSS feed

Options for "generate":
  --force              Regenerate all (ignore cache)
  --slug=<slug>        Process only specified post
  --task=<type>        "script" (text only) or "audio" (full)
  --dry-run            Preview without generating
  --lang=<zh|en>       Process only specified language

Description:
  Converts blog posts to multi-speaker podcast audio using:
  - LLM for script generation (host/guest dialogue)
  - OpenAI TTS for audio synthesis
  - FFmpeg for audio concatenation

  Results cached in datas/podcast-scripts.json
  Audio files saved to public/podcasts/{lang}/{slug}.mp3

Environment Variables:
  AI_API_KEY           OpenAI API key (required)
  AI_BASE_URL          API base URL (optional)
  AI_MODEL             Model for script generation (optional)

Examples:
  astro-minimax podcast generate
  astro-minimax podcast generate --slug=zh/getting-started
  astro-minimax podcast generate --task=script --dry-run
  astro-minimax podcast list
  astro-minimax podcast feed
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

  const scriptMap: Record<string, string> = {
    generate: "podcast-generate.js",
    list: "podcast-list.js",
    feed: "podcast-feed.js",
  };

  const script = scriptMap[subcommand];
  if (!script) {
    console.error(`Unknown subcommand: ${subcommand}`);
    console.error("Available: generate, list, feed");
    process.exit(1);
  }

  await runTool(script, subArgs, blogDir);
}

async function runTool(
  script: string,
  args: string[],
  cwd: string
): Promise<void> {
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