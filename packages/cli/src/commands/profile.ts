import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL("..", import.meta.url));
const toolsDir = join(__dirname, "tools");

export async function profileCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Author profile management

Usage:
  astro-minimax profile <subcommand>

Subcommands:
  build             Build complete author profile (context + voice + report)
  context           Build author context from posts
  voice             Build writing style profile
  report            Generate author profile report

Description:
  Generates author-related data for AI-powered features:
  - Author context: Writing patterns, topics, expertise
  - Voice profile: Style characteristics for AI responses
  - Profile report: Structured author profile for About page

  These profiles help the AI chat feature respond in a style
  consistent with the blog author's voice.

Examples:
  astro-minimax profile build
  astro-minimax profile context
  astro-minimax profile voice
  astro-minimax profile report
`);
    return;
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  const blogDir = process.cwd();
  const contentDir = join(blogDir, "src", "data", "blog");
  if (!existsSync(contentDir)) {
    console.error("Error: Not in an astro-minimax blog directory.");
    process.exit(1);
  }

  const scriptMap: Record<string, string | string[]> = {
    build: [
      "build-author-context.js",
      "build-voice-profile.js",
      "generate-author-profile.js",
    ],
    context: "build-author-context.js",
    voice: "build-voice-profile.js",
    report: "generate-author-profile.js",
  };

  const scripts = scriptMap[subcommand];
  if (!scripts) {
    console.error(`Unknown subcommand: ${subcommand}`);
    console.error("Available: build, context, voice, report");
    process.exit(1);
  }

  if (Array.isArray(scripts)) {
    for (const script of scripts) {
      await runTool(script, subArgs, blogDir);
    }
  } else {
    await runTool(scripts, subArgs, blogDir);
  }
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