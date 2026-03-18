#!/usr/bin/env npx tsx
/**
 * List generated podcasts
 */

import { readFile, access } from "node:fs/promises";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "datas");
const SCRIPTS_FILE = join(DATA_DIR, "podcast-scripts.json");
const AUDIO_FILE = join(DATA_DIR, "podcast-audio.json");

async function main(): Promise<void> {
  console.log("Generated Podcasts");
  console.log("─".repeat(60));

  let scripts: Record<string, unknown> = {};
  let audio: Record<string, { duration?: number; fileSize?: number }> = {};

  try {
    const scriptsData = await readFile(SCRIPTS_FILE, "utf-8");
    scripts = JSON.parse(scriptsData).articles || {};
  } catch {
    console.log("No scripts found. Run 'astro-minimax podcast generate' first.");
    return;
  }

  try {
    const audioData = await readFile(AUDIO_FILE, "utf-8");
    audio = JSON.parse(audioData).articles || {};
  } catch {}

  const slugs = Object.keys(scripts);
  if (slugs.length === 0) {
    console.log("No podcasts generated yet.");
    return;
  }

  console.log(`Total: ${slugs.length} podcasts\n`);

  for (const slug of slugs.sort()) {
    const script = scripts[slug] as { title?: string; segments?: unknown[] };
    const audioMeta = audio[slug] || {};

    const title = script.title || slug;
    const segments = script.segments?.length || 0;
    const duration = audioMeta.duration
      ? formatDuration(audioMeta.duration)
      : "N/A";
    const size = audioMeta.fileSize
      ? formatSize(audioMeta.fileSize)
      : "N/A";

    console.log(`${slug}`);
    console.log(`  Title: ${title}`);
    console.log(`  Segments: ${segments}`);
    console.log(`  Duration: ${duration}`);
    console.log(`  Size: ${size}`);
    console.log("");
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

main().catch(console.error);