import { HEADER_FIREBASE_APP_CHECK } from '@/config/constants';

import { isFirebaseAppCheckSkipped, requireAppCheckForToken } from './firebase-app-check';

const verifyToken = jest.fn();
const recordAppCheckFailure = jest.fn();

type TestEnv = {
  APP_ENV?: string;
  SKIP_FIREBASE_APP_CHECK?: string;
};

function setTestEnv(overrides: TestEnv): () => void {
  const env = process.env as TestEnv;
  const saved: TestEnv = {
    APP_ENV: env.APP_ENV,
    SKIP_FIREBASE_APP_CHECK: env.SKIP_FIREBASE_APP_CHECK,
  };

  for (const key of Object.keys(overrides) as (keyof TestEnv)[]) {
    const value = overrides[key];
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }

  return () => {
    for (const key of Object.keys(saved) as (keyof TestEnv)[]) {
      const value = saved[key];
      if (value === undefined) {
        delete env[key];
      } else {
        env[key] = value;
      }
    }
  };
}

jest.mock('@/lib/firebase-admin', () => ({
  isFirebaseAdminConfigured: jest.fn(() => true),
  getFirebaseAdmin: jest.fn(() => ({
    appCheck: () => ({ verifyToken }),
  })),
}));

jest.mock('@/lib/api-telemetry', () => ({
  recordAppCheckFailure: (...args: unknown[]) => recordAppCheckFailure(...args),
}));

jest.mock('@/lib/firebase-app-check-app-ids', () => ({
  isAllowedFirebaseAppCheckAppId: jest.fn(() => true),
}));

describe('isFirebaseAppCheckSkipped', () => {
  it('is true only in development with SKIP_FIREBASE_APP_CHECK=1', () => {
    const restore = setTestEnv({
      APP_ENV: 'development',
      SKIP_FIREBASE_APP_CHECK: '1',
    });

    try {
      expect(isFirebaseAppCheckSkipped()).toBe(true);

      setTestEnv({ SKIP_FIREBASE_APP_CHECK: '0' });
      expect(isFirebaseAppCheckSkipped()).toBe(false);

      setTestEnv({ APP_ENV: 'production', SKIP_FIREBASE_APP_CHECK: '1' });
      expect(isFirebaseAppCheckSkipped()).toBe(false);

      setTestEnv({ APP_ENV: 'preview', SKIP_FIREBASE_APP_CHECK: '1' });
      expect(isFirebaseAppCheckSkipped()).toBe(false);
    } finally {
      restore();
    }
  });
});

describe('requireAppCheckForToken', () => {
  beforeEach(() => {
    verifyToken.mockReset();
    recordAppCheckFailure.mockReset();
    verifyToken.mockResolvedValue({ appId: '1:828265085007:ios:1e2559c39ffa5bdbced23a' });
  });

  it('skips verification in development when SKIP_FIREBASE_APP_CHECK=1', async () => {
    const restore = setTestEnv({
      APP_ENV: 'development',
      SKIP_FIREBASE_APP_CHECK: '1',
    });

    try {
      const response = await requireAppCheckForToken(new Request('https://example.com/api/token'));
      expect(response).toBeNull();
      expect(verifyToken).not.toHaveBeenCalled();
      expect(recordAppCheckFailure).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('rejects when header is missing', async () => {
    const response = await requireAppCheckForToken(new Request('https://example.com/api/token'));
    expect(response?.status).toBe(401);
    expect(verifyToken).not.toHaveBeenCalled();
    expect(recordAppCheckFailure).toHaveBeenCalledWith('missing');
  });

  it('accepts a valid App Check token', async () => {
    const request = new Request('https://example.com/api/token', {
      headers: { [HEADER_FIREBASE_APP_CHECK]: 'valid-token' },
    });

    const response = await requireAppCheckForToken(request);
    expect(response).toBeNull();
    expect(verifyToken).toHaveBeenCalledWith('valid-token');
    expect(recordAppCheckFailure).not.toHaveBeenCalled();
  });

  it('rejects when verification fails', async () => {
    verifyToken.mockRejectedValue(new Error('invalid'));

    const request = new Request('https://example.com/api/token', {
      headers: { [HEADER_FIREBASE_APP_CHECK]: 'bad-token' },
    });

    const response = await requireAppCheckForToken(request);
    expect(response?.status).toBe(401);
    expect(recordAppCheckFailure).toHaveBeenCalledWith('invalid');
  });
});
