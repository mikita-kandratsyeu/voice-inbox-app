import { isSkipFirebaseAppCheckEnabled } from '@/shared/config/buildEnv';

import { shouldSkipFirebaseAppCheck } from '../shouldSkipAppCheck';

jest.mock('@/shared/config/buildEnv', () => ({
  isSkipFirebaseAppCheckEnabled: jest.fn(() => false),
}));

const isSkipFirebaseAppCheckEnabledMock = isSkipFirebaseAppCheckEnabled as jest.Mock;

describe('shouldSkipFirebaseAppCheck', () => {
  afterEach(() => {
    isSkipFirebaseAppCheckEnabledMock.mockReset();
    isSkipFirebaseAppCheckEnabledMock.mockReturnValue(false);
  });

  it('delegates to isSkipFirebaseAppCheckEnabled', () => {
    isSkipFirebaseAppCheckEnabledMock.mockReturnValue(true);
    expect(shouldSkipFirebaseAppCheck()).toBe(true);
    expect(isSkipFirebaseAppCheckEnabledMock).toHaveBeenCalled();
  });

  it('returns false when flag is off', () => {
    expect(shouldSkipFirebaseAppCheck()).toBe(false);
  });
});
