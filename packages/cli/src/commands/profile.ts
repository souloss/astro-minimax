import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export async function profileCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Author profile management

Usage:
  astro-minimax profile <subcommand> [options]

Subcommands:
  build            Build author profile from blog posts
  voice            Build writing style profile
  context          Build author context for AI

Examples:
  astro-minimax profile build
  astro-minimax profile voice
  astro-minimax profile context
`);
    return;
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  const toolsDir = join(process.cwd(), "tools");
  if (!existsSync(toolsDir)) {
    console.error("Error: Not in an astro-minimax blog directory.");
    process.exit(1);
  }

  const scriptMap: Record<string, string> = {
    build: "build-author-context.ts",
    voice: "build-voice-profile.ts",
    context: "generate-author-profile.ts",
  };

  const script = scriptMap[subcommand];
  if (!script) {
    console.error(`Unknown profile subcommand: ${subcommand}`);
    process.exit(1);
  }

  await runTool(script, subArgs);
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