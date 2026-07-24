import { getAppEnv, isDevelopmentAppEnv, isProductionLikeAppEnv } from './app-env';

type TestEnv = {
  APP_ENV?: string;
};

function setTestEnv(overrides: TestEnv): () => void {
  const env = process.env as TestEnv;
  const saved: TestEnv = {
    APP_ENV: env.APP_ENV,
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

describe('getAppEnv', () => {
  it('returns explicit APP_ENV values', () => {
    const restore = setTestEnv({ APP_ENV: 'preview' });

    try {
      expect(getAppEnv()).toBe('preview');
    } finally {
      restore();
    }
  });

  it('defaults to production when APP_ENV is unset', () => {
    const restore = setTestEnv({ APP_ENV: undefined });

    try {
      expect(getAppEnv()).toBe('production');
    } finally {
      restore();
    }
  });
});

describe('isProductionLikeAppEnv', () => {
  it('is true for production and preview', () => {
    const restoreProd = setTestEnv({ APP_ENV: 'production' });
    try {
      expect(isProductionLikeAppEnv()).toBe(true);
    } finally {
      restoreProd();
    }

    const restorePreview = setTestEnv({ APP_ENV: 'preview' });
    try {
      expect(isProductionLikeAppEnv()).toBe(true);
      expect(isDevelopmentAppEnv()).toBe(false);
    } finally {
      restorePreview();
    }
  });

  it('is false for development', () => {
    const restore = setTestEnv({ APP_ENV: 'development' });
    try {
      expect(isProductionLikeAppEnv()).toBe(false);
      expect(isDevelopmentAppEnv()).toBe(true);
    } finally {
      restore();
    }
  });
});
