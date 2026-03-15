#!/usr/bin/env node
/**
 * Standalone local AI dev server using Node.js built-in HTTP.
 * Runs alongside `astro dev` to provide /api/chat and /api/ai-info endpoints
 * when wrangler pages dev is unavailable.
 *
 * Usage:
 *   node --max-old-space-size=4096 packages/ai/src/server/dev-server.ts
 *   # or via tsx:
 *   tsx packages/ai/src/server/dev-server.ts
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve paths relative to apps/blog (where .env and datas/ live)
function findBlogRoot(): string {
  let dir = process.cwd();
  // Walk up until we find datas/ directory or package.json with astro-minimax-blog
  for (let i = 0; i < 5; i++) {
    if (existsSync(resolve(dir, 'datas', 'ai-summaries.json'))) return dir;
    if (existsSync(resolve(dir, 'apps', 'blog', 'datas', 'ai-summaries.json'))) return resolve(dir, 'apps', 'blog');
    dir = resolve(dir, '..');
  }
  return process.cwd();
}

const blogRoot = findBlogRoot();

// Load .env
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

loadEnv(resolve(blogRoot, '.env'));

// Dynamic imports of the AI handler
async function setupHandler() {
  const { handleChatRequest, initializeMetadata } = await import('./index.js');

  // Load metadata from datas/
  const datasDir = resolve(blogRoot, 'datas');
  const loadJson = (file: string) => {
    const path = resolve(datasDir, file);
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf-8'));
    }
    return {};
  };

  const env: Record<string, unknown> = {
    ...process.env,
  };

  initializeMetadata({
    summaries: loadJson('ai-summaries.json'),
    authorContext: loadJson('author-context.json'),
    voiceProfile: loadJson('voice-profile.json'),
    siteUrl: process.env.SITE_URL || 'http://localhost:4321',
  }, env as never);

  return { handleChatRequest, env };
}

// Convert Node.js IncomingMessage to Request
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

// Convert Web Response to Node.js ServerResponse
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
  const port = parseInt(process.env.AI_DEV_PORT || '8787', 10);

  console.log('🤖 AI Dev Server starting...');
  console.log(`   Blog root: ${blogRoot}`);
  console.log(`   AI_BASE_URL: ${process.env.AI_BASE_URL ? '✓ configured' : '✗ not set'}`);
  console.log(`   AI_API_KEY: ${process.env.AI_API_KEY ? '✓ configured' : '✗ not set'}`);
  console.log(`   AI_MODEL: ${process.env.AI_MODEL || '(default)'}`);

  const { handleChatRequest, env } = await setupHandler();

  const server = createServer(async (req, res) => {
    // CORS for all responses
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
          ai: {
            configured: !!(process.env.AI_BASE_URL && process.env.AI_API_KEY),
            model: process.env.AI_MODEL || 'unknown',
          },
        }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (err) {
      console.error('[AI Dev Server] Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });

  server.listen(port, () => {
    console.log(`\n✅ AI Dev Server running at http://localhost:${port}`);
    console.log(`   POST http://localhost:${port}/api/chat`);
    console.log(`   GET  http://localhost:${port}/api/ai-info`);
    console.log(`\n   Configure ChatPanel apiEndpoint to http://localhost:${port}/api/chat`);
    console.log('   Or set SITE.ai.apiEndpoint in src/config.ts\n');
  });
}

main().catch((err) => {
  console.error('Failed to start AI Dev Server:', err);
  process.exit(1);
});
