import {
  isPrivateRemoteContextLengthExceeded,
  mapPrivateRemoteUserFacingError,
} from '../private-remote/privateRemoteErrorMapping';

jest.mock('@/shared/lib', () => ({
  i18n: {
    t: (key: string) => key,
  },
}));

describe('isPrivateRemoteContextLengthExceeded', () => {
  it('detects llama.cpp n_keep vs n_ctx message', () => {
    const err = new Error(
      'The number of tokens to keep from the initial prompt is greater than the context length (n_keep: 8838>= n_ctx: 4096). Try to load the model with a larger context length, or provide a shorter input.',
    );
    expect(isPrivateRemoteContextLengthExceeded(err)).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isPrivateRemoteContextLengthExceeded(new Error('HTTP 500'))).toBe(false);
  });
});

describe('mapPrivateRemoteUserFacingError', () => {
  it('maps context length errors to i18n key', () => {
    const err = new Error('n_keep: 100>= n_ctx: 50');
    expect(mapPrivateRemoteUserFacingError(err)).toBe('ai.privateRemoteContextTooLong');
  });
});
