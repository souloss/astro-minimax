import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL("..", import.meta.url));
const templateDir = join(__dirname, "..", "template");

export function initCommand(args: string[]): void {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Create a new astro-minimax blog project

Usage:
  astro-minimax init <project-name>

Examples:
  astro-minimax init my-blog
  astro-minimax init ./blogs/tech
`);
    return;
  }

  const projectName = args[0];
  const targetDir = resolve(process.cwd(), projectName);

  if (existsSync(targetDir)) {
    console.error(`Error: Directory "${projectName}" already exists.`);
    process.exit(1);
  }

  mkdirSync(targetDir, { recursive: true });
  cpSync(templateDir, targetDir, { recursive: true });

  const pkgPath = join(targetDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  pkg.name = basename(targetDir);
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  console.log(`\n  ✅ Created "${projectName}" successfully!\n`);
  console.log("  Next steps:\n");
  console.log(`    cd ${projectName}`);
  console.log("    pnpm install");
  console.log("    pnpm dev\n");
  console.log("  CLI commands:\n");
  console.log("    astro-minimax ai process     # Process content with AI");
  console.log("    astro-minimax post new       # Create new blog post");
  console.log("    astro-minimax profile build  # Build author profile\n");
  console.log("  Docs: https://github.com/souloss/astro-minimax\n");
}