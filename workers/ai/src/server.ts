import { createServer, type IncomingMessage } from 'node:http';

import { handleAiWorkerPost } from '@/lib/ai-worker-http';

const port = Number(process.env.PORT) || 8080;

async function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function toFetchHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

async function toFetchRequest(req: IncomingMessage, body: Buffer): Promise<Request> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  return new Request(url, {
    method: req.method ?? 'GET',
    headers: toFetchHeaders(req),
    ...(body.length > 0 && req.method !== 'GET' && req.method !== 'HEAD' ? { body } : {}),
  });
}

createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname;

    if (req.method === 'GET' && pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === 'POST' && (pathname === '/worker' || pathname === '/')) {
      const body = await readRequestBody(req);
      const request = await toFetchRequest(req, body);
      const result = await handleAiWorkerPost(request);
      res.writeHead(result.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(result.body));
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  } catch (error) {
    console.error('[AI worker] unhandled error', error);
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'internal_error' }));
  }
}).listen(port, () => {
  console.info(`[AI worker] listening on port ${port}`);
});
