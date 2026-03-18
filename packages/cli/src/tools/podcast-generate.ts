#!/usr/bin/env npx tsx
/**
 * Podcast Generation Script
 *
 * Usage:
 *   pnpm podcast:generate                    Generate all podcasts
 *   pnpm podcast:generate --slug=zh/xxx      Single article
 *   pnpm podcast:generate --task=script      Script only
 *   pnpm podcast:generate --task=audio       Audio only
 *   pnpm podcast:generate --force            Ignore cache
 *   pnpm podcast:generate --dry-run          Preview only
 *   pnpm podcast:generate --lang=zh          Specific language
 */

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import crypto from "node:crypto";
import { getAllPosts, type PostMeta } from "./lib/posts.js";
import { extractFrontmatter } from "./lib/frontmatter.js";
import { chatCompletion, hasAPIKey, getConfig } from "./lib/ai-provider.js";
import { hasTTSApiKey } from "./lib/tts-provider.js";
import { textToSpeech } from "./lib/tts-provider.js";
import { concatenateAudio, getAudioDuration } from "./lib/audio-processor.js";
import { generateScript } from "./lib/script-generator.js";
import {
  type PodcastScript,
  type PodcastAudioMeta,
  type PodcastFrontmatter,
  type PodcastCache,
  type PodcastAudioCache,
  DEFAULT_SPEAKERS,
  isValidOpenAIVoice,
  parsePodcastFrontmatter,
} from "./lib/types.js";

const DATA_DIR = join(process.cwd(), "datas");
const PUBLIC_DIR = join(process.cwd(), "public", "podcasts");
const SCRIPTS_FILE = join(DATA_DIR, "podcast-scripts.json");
const AUDIO_FILE = join(DATA_DIR, "podcast-audio.json");
const SKIP_LIST_FILE = join(DATA_DIR, "ai-skip-list.json");

interface CliFlags {
  force: boolean;
  slug: string | null;
  task: "script" | "audio" | null;
  dryRun: boolean;
  concurrency: number;
  lang: "zh" | "en" | null;
}

function parseArgs(): CliFlags {
  const args = process.argv.slice(2);
  const flags: CliFlags = {
    force: false,
    slug: null,
    task: null,
    dryRun: false,
    concurrency: 5,
    lang: null,
  };

  for (const arg of args) {
    if (arg === "--force") flags.force = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg.startsWith("--slug=")) flags.slug = arg.split("=")[1];
    else if (arg.startsWith("--task=")) flags.task = arg.split("=")[1] as "script" | "audio";
    else if (arg.startsWith("--concurrency="))
      flags.concurrency = parseInt(arg.split("=")[1], 10);
    else if (arg.startsWith("--lang="))
      flags.lang = arg.split("=")[1] as "zh" | "en";
  }

  return flags;
}

interface CacheManager {
  load: () => Promise<PodcastCache>;
  getCache: () => PodcastCache | null;
  writeEntry: (slug: string, entry: PodcastScript, model: string) => Promise<void>;
}

function createCacheManager(cacheFile: string): CacheManager {
  let cache: PodcastCache | null = null;
  let writeQueue = Promise.resolve();

  return {
    async load(): Promise<PodcastCache> {
      const cachePath = join(DATA_DIR, cacheFile);
      try {
        const raw = await readFile(cachePath, "utf-8");
        cache = JSON.parse(raw);
      } catch {
        cache = {
          meta: { lastUpdated: null, totalProcessed: 0 },
          articles: {},
        };
      }
      return cache!;
    },

    getCache(): PodcastCache | null {
      return cache;
    },

    async writeEntry(
      slug: string,
      entry: PodcastScript,
      model: string
    ): Promise<void> {
      writeQueue = writeQueue.then(async () => {
        if (!cache) return;
        cache.articles[slug] = entry;
        cache.meta.lastUpdated = new Date().toISOString();
        cache.meta.totalProcessed = Object.keys(cache.articles).length;

        await mkdir(DATA_DIR, { recursive: true });
        const cachePath = join(DATA_DIR, cacheFile);
        await writeFile(cachePath, JSON.stringify(cache, null, 2), "utf-8");
      });
      return writeQueue;
    },
  };
}

interface AudioCacheManager {
  load: () => Promise<PodcastAudioCache>;
  writeEntry: (slug: string, entry: PodcastAudioMeta) => Promise<void>;
}

function createAudioCacheManager(): AudioCacheManager {
  let cache: PodcastAudioCache | null = null;
  let writeQueue = Promise.resolve();

  return {
    async load(): Promise<PodcastAudioCache> {
      try {
        const raw = await readFile(AUDIO_FILE, "utf-8");
        cache = JSON.parse(raw);
      } catch {
        cache = {
          meta: { lastUpdated: null, totalProcessed: 0 },
          articles: {},
        };
      }
      return cache!;
    },

    async writeEntry(slug: string, entry: PodcastAudioMeta): Promise<void> {
      writeQueue = writeQueue.then(async () => {
        if (!cache) return;
        cache.articles[slug] = entry;
        cache.meta.lastUpdated = new Date().toISOString();
        cache.meta.totalProcessed = Object.keys(cache.articles).length;

        await mkdir(DATA_DIR, { recursive: true });
        await writeFile(AUDIO_FILE, JSON.stringify(cache, null, 2), "utf-8");
      });
      return writeQueue;
    },
  };
}

type SkipList = Record<string, { slug: string; task: string; reason: string }>;

async function loadSkipList(): Promise<SkipList> {
  try {
    const raw = await readFile(SKIP_LIST_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveSkipList(skipList: SkipList): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SKIP_LIST_FILE, JSON.stringify(skipList, null, 2), "utf-8");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Article extends PostMeta {
  contentHash: string;
  fullContent: string;
  pubTimestamp: number;
}

async function scanArticles(flags: CliFlags): Promise<Article[]> {
  const allPosts = await getAllPosts({ includeDrafts: false, stripBody: false });
  const articles: Article[] = [];

  for (const post of allPosts) {
    if (post.draft) continue;
    if (flags.lang && post.lang !== flags.lang) continue;

    const rawContent = await readFile(post.filePath, "utf-8");
    const fm = extractFrontmatter(rawContent);
    const contentHash = crypto
      .createHash("md5")
      .update(fm.body)
      .digest("hex")
      .slice(0, 8);

    const pubDatetime = fm.data.pubDatetime;
    const pubTimestamp = pubDatetime
      ? new Date(pubDatetime as string).getTime()
      : 0;

    articles.push({
      ...post,
      contentHash,
      fullContent: fm.body,
      pubTimestamp,
    });
  }

  articles.sort((a, b) => b.pubTimestamp - a.pubTimestamp);
  return articles;
}

async function processArticle(
  article: Article,
  flags: CliFlags,
  scriptCache: CacheManager,
  audioCache: AudioCacheManager,
  skipList: SkipList
): Promise<{ success: boolean; error?: string }> {
  const config = getConfig();
  const lang = article.lang as "zh" | "en";
  const speakers = DEFAULT_SPEAKERS[lang];

  try {
    let script: PodcastScript | null = null;

    if (flags.task !== "audio") {
      script = await generateScript(
        {
          id: article.id,
          title: article.title,
          lang,
          body: article.fullContent,
          category: article.category || "",
          tags: article.tags,
        },
        { speakers }
      );
      script.contentHash = article.contentHash;

      if (!flags.dryRun) {
        await scriptCache.writeEntry(article.id, script, config.model);
      }
    }

    if (flags.task !== "script") {
      if (!script) {
        const cache = scriptCache.getCache();
        script = cache?.articles[article.id] || null;
      }

      if (!script) {
        return { success: false, error: "No script available for audio generation" };
      }

      if (!hasTTSApiKey()) {
        return { success: false, error: "TTS API key not configured" };
      }

      const audioSegments: Uint8Array[] = [];

      for (const segment of script.segments) {
        const speaker = speakers.find((s) => s.id === segment.speaker) || speakers[0];
        const voice = isValidOpenAIVoice(speaker.voiceId) ? speaker.voiceId : "alloy";

        const audio = await textToSpeech(segment.text, { voice });
        audioSegments.push(audio);

        await sleep(200);
      }

      const finalAudio = await concatenateAudio(audioSegments);
      const duration = await getAudioDuration(finalAudio);

      const outputDir = join(PUBLIC_DIR, lang);
      await mkdir(outputDir, { recursive: true });

      const outputFile = join(outputDir, `${article.id.split("/")[1]}.mp3`);
      await writeFile(outputFile, finalAudio);

      const audioMeta: PodcastAudioMeta = {
        slug: article.id,
        lang,
        duration,
        fileSize: finalAudio.length,
        format: "mp3",
        generatedAt: new Date().toISOString(),
        contentHash: article.contentHash,
      };

      if (!flags.dryRun) {
        await audioCache.writeEntry(article.id, audioMeta);
      }
    }

    const skipKey = `podcast:${article.id}`;
    if (skipList[skipKey]) {
      delete skipList[skipKey];
      await saveSkipList(skipList);
    }

    return { success: true };
  } catch (err) {
    const errorMsg = (err as Error).message;
    await saveSkipList({
      ...skipList,
      [`podcast:${article.id}`]: {
        slug: article.id,
        task: "podcast",
        reason: errorMsg,
      },
    });
    return { success: false, error: errorMsg };
  }
}

async function main(): Promise<void> {
  const flags = parseArgs();

  if (!hasAPIKey()) {
    console.error("Missing AI API Key. Set AI_API_KEY environment variable.");
    process.exit(1);
  }

  const config = getConfig();
  let skipList = await loadSkipList();

  console.log("Podcast Generator (astro-minimax)");
  console.log("─".repeat(50));
  console.log(`Model: ${config.model}`);
  console.log(`API: ${config.baseUrl}`);
  console.log("");

  console.log("Scanning articles...");
  let articles = await scanArticles(flags);
  console.log(`Found ${articles.length} articles`);

  if (flags.slug) {
    articles = articles.filter((a) => a.id === flags.slug);
    if (articles.length === 0) {
      console.error(`Article not found: ${flags.slug}`);
      process.exit(1);
    }
    console.log(`Processing single article: ${flags.slug}`);
  }

  const scriptCache = createCacheManager("podcast-scripts.json");
  await scriptCache.load();

  const audioCache = createAudioCacheManager();
  await audioCache.load();

  const queue: Article[] = [];

  for (const article of articles) {
    const skipKey = `podcast:${article.id}`;

    if (!flags.force && skipList[skipKey]) {
      continue;
    }

    const cached = scriptCache.getCache()?.articles[article.id];
    if (flags.force || !cached || cached.contentHash !== article.contentHash) {
      queue.push(article);
    }
  }

  console.log(`Processing: ${queue.length} articles`);

  if (flags.dryRun) {
    console.log("\nDry run - would process:");
    for (const a of queue) {
      console.log(`  - ${a.id}`);
    }
    return;
  }

  if (queue.length === 0) {
    console.log("Nothing to process");
    return;
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < queue.length; i++) {
    const article = queue[i];
    console.log(`\n[${i + 1}/${queue.length}] Processing: ${article.id}`);

    const result = await processArticle(
      article,
      flags,
      scriptCache,
      audioCache,
      skipList
    );

    if (result.success) {
      success++;
      console.log(`  Done`);
    } else {
      failed++;
      console.error(`  Failed: ${result.error}`);
    }
  }

  console.log(`\nCompleted: ${success} success, ${failed} failed`);
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});