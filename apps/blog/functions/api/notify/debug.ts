/// <reference types="@cloudflare/workers-types" />

interface DebugEnv {
  [key: string]: unknown;
}

export const onRequest: PagesFunction<DebugEnv> = async (context) => {
  const { request } = context;
  
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  let body = null;
  let bodyError = null;
  try {
    body = await request.json();
  } catch (e) {
    bodyError = e instanceof Error ? e.message : String(e);
  }
  
  const debug = {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    headers,
    body,
    bodyError,
  };
  
  console.log('[notify/debug] Request received:', JSON.stringify(debug, null, 2));
  
  return new Response(JSON.stringify(debug, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
};