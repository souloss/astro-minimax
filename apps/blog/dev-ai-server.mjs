#!/usr/bin/env node
/**
 * Standalone local AI dev server.
 * Runs alongside `astro dev` to provide /api/chat and /api/ai-info.
 *
 * Usage: node dev-ai-server.mjs
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
const envPath = resolve(__dirname, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

// Import compiled AI server module
const { handleChatRequest, initializeMetadata } = await import('../../packages/ai/dist/server/index.js');

// Load metadata
const datasDir = resolve(__dirname, 'datas');
const loadJson = (file) => {
  const p = resolve(datasDir, file);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : {};
};

const env = { ...process.env };

initializeMetadata({
  summaries: loadJson('ai-summaries.json'),
  authorContext: loadJson('author-context.json'),
  voiceProfile: loadJson('voice-profile.json'),
  siteUrl: process.env.SITE_URL || 'http://localhost:4321',
}, env);

// HTTP helpers
function toWebRequest(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      resolve(new Request(`http://localhost${req.url || '/'}`, {
        method: req.method || 'GET',
        headers: req.headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
      }));
    });
    req.on('error', reject);
  });
}

async function sendWebResponse(webRes, res) {
  res.writeHead(webRes.status, Object.fromEntries(webRes.headers.entries()));
  if (!webRes.body) { res.end(); return; }
  const reader = webRes.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } finally { res.end(); }
}

// Start server
const port = parseInt(process.env.AI_DEV_PORT || '8787', 10);

console.log('🤖 AI Dev Server starting...');
console.log(`   AI_BASE_URL: ${process.env.AI_BASE_URL ? '✓ configured' : '✗ not set'}`);
console.log(`   AI_API_KEY: ${process.env.AI_API_KEY ? '✓ configured' : '✗ not set'}`);
console.log(`   AI_MODEL: ${process.env.AI_MODEL || '(default)'}`);

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session-id');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  try {
    if (req.url?.startsWith('/api/chat')) {
      const webReq = await toWebRequest(req);
      const webRes = await handleChatRequest({ env, request: webReq });
      await sendWebResponse(webRes, res);
      return;
    }
    if (req.url?.startsWith('/api/ai-info')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok', mode: 'dev-server',
        ai: { configured: !!(process.env.AI_BASE_URL && process.env.AI_API_KEY), model: process.env.AI_MODEL },
      }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (err) {
    console.error('[AI Dev Server] Error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error', detail: err.message }));
  }
});

server.listen(port, () => {
  console.log(`\n✅ AI Dev Server: http://localhost:${port}`);
  console.log(`   POST /api/chat | GET /api/ai-info\n`);
});
