#!/usr/bin/env node
/**
 * Standalone local AI dev server using Node.js built-in HTTP.
 * Runs alongside `astro dev` to provide /api/chat and /api/ai-info endpoints
 * when wrangler pages dev is unavailable.
 *
 * Usage:
 *   pnpm exec astro-ai-dev           # Start dev server
 *   pnpm exec astro-ai-dev --init    # Initialize datas/ directory
 *
 * Environment variables:
 *   AI_DEV_PORT - Port to listen on (default: 8787)
 *   AI_BASE_URL - AI provider base URL
 *   AI_API_KEY  - AI provider API key
 *   AI_MODEL    - AI model name
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_SUMMARIES = { meta: { lastUpdated: new Date().toISOString(), model: 'none', totalProcessed: 0 }, articles: {} };
const DEFAULT_AUTHOR_CONTEXT = { author: {}, posts: [] };
const DEFAULT_VOICE_PROFILE = { style: {}, examples: [] };

function findBlogRoot(): { root: string; datasDir: string; hasDatas: boolean } {
  let dir = process.cwd();

  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, 'datas'))) {
      return { root: dir, datasDir: resolve(dir, 'datas'), hasDatas: true };
    }
    if (existsSync(resolve(dir, 'apps', 'blog', 'datas'))) {
      return { root: resolve(dir, 'apps', 'blog'), datasDir: resolve(dir, 'apps', 'blog', 'datas'), hasDatas: true };
    }
    if (existsSync(resolve(dir, 'src', 'data'))) {
      return { root: dir, datasDir: resolve(dir, 'src', 'data'), hasDatas: true };
    }
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }

  return { root: process.cwd(), datasDir: resolve(process.cwd(), 'datas'), hasDatas: false };
}

function loadEnv(envPath: string): void {
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function initDatasDirectory(datasDir: string): void {
  if (!existsSync(datasDir)) {
    mkdirSync(datasDir, { recursive: true });
  }

  const files = [
    { name: 'ai-summaries.json', content: DEFAULT_SUMMARIES },
    { name: 'author-context.json', content: DEFAULT_AUTHOR_CONTEXT },
    { name: 'voice-profile.json', content: DEFAULT_VOICE_PROFILE },
  ];

  for (const file of files) {
    const filePath = resolve(datasDir, file.name);
    if (!existsSync(filePath)) {
      writeFileSync(filePath, JSON.stringify(file.content, null, 2) + '\n');
      console.log(`   Created ${file.name}`);
    } else {
      console.log(`   Skipped ${file.name} (already exists)`);
    }
  }
}

function loadJson(datasDir: string, file: string, defaultValue: unknown): unknown {
  const path = resolve(datasDir, file);
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (e) {
      console.warn(`   Warning: Failed to parse ${file}, using defaults`);
      return defaultValue;
    }
  }
  return defaultValue;
}

async function setupHandler(datasDir: string, hasDatas: boolean) {
  const { handleChatRequest, initializeMetadata } = await import('./index.js');

  // Show warnings for missing metadata
  if (!hasDatas) {
    console.log('\n   ⚠️  No datas/ directory found. AI chat will work with empty context.');
    console.log('   Run "pnpm exec astro-ai-dev --init" to create placeholder files.\n');
  } else {
    const hasSummaries = existsSync(resolve(datasDir, 'ai-summaries.json'));
    const hasAuthor = existsSync(resolve(datasDir, 'author-context.json'));
    if (!hasSummaries || !hasAuthor) {
      console.log('\n   ⚠️  Some metadata files are missing. AI chat may have limited context.\n');
    }
  }

  const summaries = loadJson(datasDir, 'ai-summaries.json', DEFAULT_SUMMARIES);
  const authorContext = loadJson(datasDir, 'author-context.json', DEFAULT_AUTHOR_CONTEXT);
  const voiceProfile = loadJson(datasDir, 'voice-profile.json', DEFAULT_VOICE_PROFILE);

  const env: Record<string, unknown> = { ...process.env };

  initializeMetadata({
    summaries: summaries as Parameters<typeof initializeMetadata>[0]['summaries'],
    authorContext: authorContext as Parameters<typeof initializeMetadata>[0]['authorContext'],
    voiceProfile: voiceProfile as Parameters<typeof initializeMetadata>[0]['voiceProfile'],
    siteUrl: process.env.SITE_URL || 'http://localhost:4321',
  }, env as never);

  return { handleChatRequest, env };
}

function toWebRequest(req: IncomingMessage): Promise<Request> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const url = `http://localhost${req.url || '/'}`;
      resolve(new Request(url, {
        method: req.method || 'GET',
        headers: req.headers as Record<string, string>,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
      }));
    });
    req.on('error', reject);
  });
}

async function sendWebResponse(webRes: Response, res: ServerResponse): Promise<void> {
  res.writeHead(webRes.status, Object.fromEntries(webRes.headers as unknown as Iterable<[string, string]>));
  if (!webRes.body) {
    res.end();
    return;
  }
  const reader = webRes.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } finally {
    res.end();
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--init') || args.includes('-i')) {
    const { datasDir } = findBlogRoot();
    console.log('\n📦 Initializing datas/ directory...\n');
    console.log(`   Location: ${datasDir}\n`);
    initDatasDirectory(datasDir);
    console.log('\n✅ Done! You can now configure your AI metadata files.\n');
    process.exit(0);
  }

  const port = parseInt(process.env.AI_DEV_PORT || '8787', 10);
  const { root: blogRoot, datasDir, hasDatas } = findBlogRoot();

  loadEnv(resolve(blogRoot, '.env'));

  console.log('\n🤖 AI Dev Server starting...\n');
  console.log(`   Working directory: ${blogRoot}`);
  console.log(`   Datas directory: ${datasDir} ${hasDatas ? '✓' : '(not found)'}`);
  console.log(`   Port: ${port}`);
  console.log(`   AI_BASE_URL: ${process.env.AI_BASE_URL ? '✓ configured' : '✗ not set'}`);
  console.log(`   AI_API_KEY: ${process.env.AI_API_KEY ? '✓ configured' : '✗ not set'}`);
  console.log(`   AI_MODEL: ${process.env.AI_MODEL || '(default)'}`);

  const { handleChatRequest, env } = await setupHandler(datasDir, hasDatas);

  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session-id');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url || '/';

    try {
      if (url.startsWith('/api/chat')) {
        const webReq = await toWebRequest(req);
        const webRes = await handleChatRequest({ env: env as never, request: webReq });
        await sendWebResponse(webRes, res);
        return;
      }

      if (url.startsWith('/api/ai-info')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          mode: 'dev-server',
          datas: { found: hasDatas, path: datasDir },
          ai: {
            configured: !!(process.env.AI_BASE_URL && process.env.AI_API_KEY),
            model: process.env.AI_MODEL || 'unknown',
          },
        }, null, 2));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (err) {
      console.error('[AI Dev Server] Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) }));
    }
  });

  server.listen(port, () => {
    console.log(`\n✅ AI Dev Server running at http://localhost:${port}`);
    console.log(`   POST http://localhost:${port}/api/chat`);
    console.log(`   GET  http://localhost:${port}/api/ai-info`);
    console.log(`\n   Tip: Run "pnpm exec astro-ai-dev --init" to create datas/ directory.\n`);
  });
}

main().catch((err) => {
  console.error('\n❌ Failed to start AI Dev Server:', err);
  process.exit(1);
});