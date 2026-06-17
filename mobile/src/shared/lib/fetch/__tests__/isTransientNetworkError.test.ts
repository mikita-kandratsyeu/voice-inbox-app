import { isTransientNetworkError } from '@/shared/lib/fetch/isTransientNetworkError';

describe('isTransientNetworkError', () => {
  it('returns true for AbortError', () => {
    const err = new Error('aborted');
    err.name = 'AbortError';
    expect(isTransientNetworkError(err)).toBe(true);
  });

  it('returns true for iOS request timeout dumps', () => {
    expect(
      isTransientNetworkError(
        new Error('Error Domain=NSURLErrorDomain Code=-1001 "Превышен лимит времени на запрос."'),
      ),
    ).toBe(true);
  });

  it('returns false for HTTP 401 responses', () => {
    expect(isTransientNetworkError(new Error('Token request failed: 401'))).toBe(false);
  });
});
