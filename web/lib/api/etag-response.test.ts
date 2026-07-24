import { jsonWithEtag } from './etag-response';

describe('jsonWithEtag', () => {
  it('returns 304 when If-None-Match matches', async () => {
    const payload = { ok: true };
    const first = jsonWithEtag(new Request('https://example.com/api/test'), payload);
    const etag = first.headers.get('ETag');
    expect(etag).toBeTruthy();

    const cached = jsonWithEtag(
      new Request('https://example.com/api/test', { headers: { 'if-none-match': etag! } }),
      payload,
    );

    expect(cached.status).toBe(304);
    expect(await cached.text()).toBe('');
  });

  it('returns JSON body with ETag on cache miss', async () => {
    const response = jsonWithEtag(new Request('https://example.com/api/test'), { value: 1 });
    expect(response.status).toBe(200);
    expect(response.headers.get('ETag')).toMatch(/^"/);
    await expect(response.json()).resolves.toEqual({ value: 1 });
  });
});
