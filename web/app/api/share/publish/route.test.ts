import { DELETE, GET, POST } from '@/app/api/share/publish/route';

jest.mock('@/lib/mobile-api-guard', () => ({
  assertMobileAuthenticatedDevice: jest.fn(async () => ({ ok: true, deviceId: 'dev1', pathname: '/api/share/publish' })),
}));
jest.mock('@/lib/pro-entitlement', () => ({
  isProDevice: jest.fn(async () => true),
}));
jest.mock('@/lib/api', () => {
  return {
    HttpStatus: { BAD_REQUEST: 400, FORBIDDEN: 403, NOT_FOUND: 404 },
    apiError: (message: string, status: number) => new Response(JSON.stringify({ error: message }), { status }),
    parseJsonBody: async (request: Request) => {
      try {
        return await request.json();
      } catch {
        return null;
      }
    },
    checkSupportRateLimit: jest.fn(async () => null),
  };
});
jest.mock('@/lib/prisma', () => ({
  prisma: {
    publishedNote: {
      findUnique: jest.fn(async () => null),
      findFirst: jest.fn(async () => null),
      upsert: jest.fn(async () => ({
        token: 'tok',
        template: 'noteBrief',
        expiresAt: null,
        publishedAt: new Date('2026-01-01T00:00:00.000Z'),
      })),
      update: jest.fn(async () => ({})),
    },
  },
}));

describe('/api/share/publish route', () => {
  test('GET requires recordId', async () => {
    const res = await GET(new Request('https://example.com/api/share/publish'));
    expect(res.status).toBe(400);
  });

  test('POST validates template', async () => {
    const res = await POST(
      new Request('https://example.com/api/share/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          recordId: 'r1',
          title: 'Title',
          template: 'bad-template',
          markdown: '# Note',
          expiresIn: '7d',
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  test('DELETE returns ok when record missing', async () => {
    const res = await DELETE(
      new Request('https://example.com/api/share/publish', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ recordId: 'missing' }),
      }),
    );
    expect(res.status).toBe(200);
  });
});
