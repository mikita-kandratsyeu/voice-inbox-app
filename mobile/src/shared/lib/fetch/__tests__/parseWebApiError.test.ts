import { tryParseWebApiErrorBody } from '../parseWebApiError';

describe('tryParseWebApiErrorBody', () => {
  it('parses JSON API error bodies', () => {
    expect(tryParseWebApiErrorBody('{"error":"Not found","code":"not_found"}')).toEqual({
      error: 'Not found',
      code: 'not_found',
    });
  });

  it('returns null for plain text', () => {
    expect(tryParseWebApiErrorBody('Network error')).toBeNull();
  });
});
