import { parseInAppEventPageResponse } from '../parseInAppEventPageResponse';

describe('parseInAppEventPageResponse', () => {
  it('parses a valid payload', () => {
    const result = parseInAppEventPageResponse(200, {
      ok: true,
      eventId: 'update_1-1-0',
      locale: 'en',
      revision: 2,
      ctaLabel: 'Continue',
      documentHtml: '<!DOCTYPE html><html><body>Hi</body></html>',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.eventId).toBe('update_1-1-0');
      expect(result.page.ctaLabel).toBe('Continue');
    }
  });

  it('maps 404 to not_found', () => {
    expect(parseInAppEventPageResponse(404, { ok: false })).toEqual({
      ok: false,
      error: 'not_found',
    });
  });

  it('rejects incomplete payload', () => {
    const result = parseInAppEventPageResponse(200, { ok: true, eventId: 'x' });
    expect(result).toEqual({ ok: false, error: 'invalid_payload' });
  });
});
