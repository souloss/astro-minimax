import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL("..", import.meta.url));
const templateDir = join(__dirname, "..", "template");
const pwaDir = join(__dirname, "..", "template-pwa");

export function initCommand(args: string[]): void {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Create a new astro-minimax blog project

Usage:
  astro-minimax init <project-name> [options]

Arguments:
  <project-name>    Directory name for the new blog

Options:
  --pwa             Include PWA support (service worker, manifest.json)

Description:
  Creates a new blog with all necessary configuration files,
  AI-powered features, and a clean structure ready for content.

Examples:
  astro-minimax init my-blog
  astro-minimax init my-blog --pwa
  astro-minimax init ./blogs/tech-blog
`);
    return;
  }

  const enablePwa = args.includes("--pwa");
  const projectName = args.find(a => !a.startsWith("--"))!;
  const targetDir = resolve(process.cwd(), projectName);

  if (existsSync(targetDir)) {
    console.error(`Error: Directory "${projectName}" already exists.`);
    process.exit(1);
  }

  mkdirSync(targetDir, { recursive: true });
  cpSync(templateDir, targetDir, { recursive: true });

  if (enablePwa && existsSync(pwaDir)) {
    cpSync(pwaDir, targetDir, { recursive: true });
    console.log("  📦 PWA support enabled (sw.js + manifest.json)\n");
  }

  const pkgPath = join(targetDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  pkg.name = basename(targetDir);
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  console.log(`\n  ✅ Created "${projectName}" successfully!\n`);
  console.log("  Getting started:\n");
  console.log(`    cd ${projectName}`);
  console.log("    pnpm install");
  console.log("    pnpm dev\n");
  console.log("  CLI commands:\n");
  console.log("    astro-minimax post new <title>    Create a new post");
  console.log("    astro-minimax ai process          Process with AI");
  console.log("    astro-minimax profile build        Build author profile\n");
  console.log("  Documentation: https://github.com/souloss/astro-minimax\n");
}