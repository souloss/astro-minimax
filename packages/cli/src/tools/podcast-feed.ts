#!/usr/bin/env npx tsx
/**
 * Generate Podcast RSS Feed
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PodcastAudioMeta } from "./lib/types.js";

const DATA_DIR = join(process.cwd(), "datas");
const PUBLIC_DIR = join(process.cwd(), "public");
const AUDIO_FILE = join(DATA_DIR, "podcast-audio.json");
const SCRIPTS_FILE = join(DATA_DIR, "podcast-scripts.json");

interface SiteConfig {
  website: string;
  title: string;
  desc: string;
  author: string;
}

async function loadSiteConfig(): Promise<SiteConfig> {
  try {
    const configPath = join(process.cwd(), "src", "config.ts");
    const raw = await readFile(configPath, "utf-8");

    const websiteMatch = raw.match(/website:\s*["']([^"']+)["']/);
    const titleMatch = raw.match(/title:\s*["']([^"']+)["']/);
    const descMatch = raw.match(/desc:\s*["']([^"']+)["']/);
    const authorMatch = raw.match(/author:\s*["']([^"']+)["']/);

    return {
      website: websiteMatch?.[1] || process.env.SITE_URL || "https://example.com",
      title: titleMatch?.[1] || "Blog Podcast",
      desc: descMatch?.[1] || "AI-generated podcast from blog posts",
      author: authorMatch?.[1] || "Author",
    };
  } catch {
    return {
      website: process.env.SITE_URL || "https://example.com",
      title: "Blog Podcast",
      desc: "AI-generated podcast",
      author: "Author",
    };
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface Episode {
  slug: string;
  title: string;
  lang: string;
  duration: number;
  fileSize: number;
  generatedAt: string;
}

function generateRss(site: SiteConfig, episodes: Episode[]): string {
  const items = episodes
    .map((ep) => {
      const audioUrl = `${site.website}/podcasts/${ep.lang}/${ep.slug.split("/")[1]}.mp3`;
      return `
    <item>
      <title>${escapeXml(ep.title)}</title>
      <description>AI-generated podcast episode from blog post: ${escapeXml(ep.title)}</description>
      <enclosure url="${audioUrl}" length="${ep.fileSize}" type="audio/mpeg"/>
      <guid isPermaLink="true">${audioUrl}</guid>
      <pubDate>${new Date(ep.generatedAt).toUTCString()}</pubDate>
      <itunes:duration>${Math.ceil(ep.duration)}</itunes:duration>
    </item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.title)} Podcast</title>
    <description>${escapeXml(site.desc)}</description>
    <link>${site.website}</link>
    <atom:link href="${site.website}/podcast.xml" rel="self" type="application/rss+xml"/>
    <language>zh-cn</language>
    <itunes:author>${escapeXml(site.author)}</itunes:author>
    <itunes:summary>${escapeXml(site.desc)}</itunes:summary>
    <itunes:category text="Technology"/>
    <itunes:explicit>false</itunes:explicit>
${items}
  </channel>
</rss>`;
}

async function main(): Promise<void> {
  const site = await loadSiteConfig();

  let audioData: { articles: Record<string, PodcastAudioMeta> } = {
    articles: {},
  };
  try {
    const raw = await readFile(AUDIO_FILE, "utf-8");
    audioData = JSON.parse(raw);
  } catch {
    console.log("No audio data found. Run 'astro-minimax podcast generate' first.");
    return;
  }

  let scriptsData: { articles: Record<string, { title?: string }> } = {
    articles: {},
  };
  try {
    const raw = await readFile(SCRIPTS_FILE, "utf-8");
    scriptsData = JSON.parse(raw);
  } catch {}

  const episodes: Episode[] = [];
  for (const [slug, meta] of Object.entries(audioData.articles)) {
    const script = scriptsData.articles[slug];
    episodes.push({
      slug,
      title: script?.title || slug.split("/")[1] || slug,
      lang: meta.lang,
      duration: meta.duration,
      fileSize: meta.fileSize,
      generatedAt: meta.generatedAt,
    });
  }

  episodes.sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );

  if (episodes.length === 0) {
    console.log("No episodes found.");
    return;
  }

  const rss = generateRss(site, episodes);
  const outputPath = join(PUBLIC_DIR, "podcast.xml");
  await writeFile(outputPath, rss, "utf-8");

  console.log("Generated podcast RSS feed");
  console.log(`  Path: ${outputPath}`);
  console.log(`  Episodes: ${episodes.length}`);
  console.log(`  URL: ${site.website}/podcast.xml`);
}

main().catch(console.error);