import { createHash } from 'node:crypto';

import { NextResponse } from 'next/server';

function normalizeIfNoneMatch(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export function jsonWithEtag(request: Request, payload: unknown): NextResponse {
  const body = JSON.stringify(payload);
  const etag = `"${createHash('sha256').update(body).digest('base64url')}"`;
  const matches = normalizeIfNoneMatch(request.headers.get('if-none-match'));

  if (matches.includes(etag) || matches.includes('*')) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag },
    });
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ETag: etag,
    },
  });
}
