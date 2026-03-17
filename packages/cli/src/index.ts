#!/usr/bin/env node
import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { initCommand } from "./commands/init.js";
import { aiCommand } from "./commands/ai.js";
import { postCommand } from "./commands/post.js";
import { profileCommand } from "./commands/profile.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

interface Command {
  name: string;
  description: string;
  usage: string;
  run: (args: string[]) => Promise<void> | void;
}

const commands: Command[] = [
  {
    name: "init",
    description: "Create a new blog project",
    usage: "astro-minimax init <project-name>",
    run: initCommand,
  },
  {
    name: "ai",
    description: "AI-powered content processing",
    usage: "astro-minimax ai <subcommand>",
    run: aiCommand,
  },
  {
    name: "post",
    description: "Blog post management",
    usage: "astro-minimax post <subcommand>",
    run: postCommand,
  },
  {
    name: "profile",
    description: "Author profile management",
    usage: "astro-minimax profile <subcommand>",
    run: profileCommand,
  },
];

function printHelp(): void {
  console.log(`
astro-minimax - A minimalist Astro blog CLI

Usage:
  astro-minimax <command> [options]

Commands:
  init <project>      Create a new blog project
  ai <subcommand>     AI-powered content processing
  post <subcommand>   Blog post management
  profile <subcommand> Author profile management

Examples:
  astro-minimax init my-blog
  astro-minimax ai process
  astro-minimax post new "Hello World"
  astro-minimax profile build

Docs: https://github.com/souloss/astro-minimax
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printHelp();
    process.exit(0);
  }

  const commandName = args[0];
  const command = commands.find((c) => c.name === commandName);

  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    console.error("Run 'astro-minimax --help' for usage.");
    process.exit(1);
  }

  try {
    await command.run(args.slice(1));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();