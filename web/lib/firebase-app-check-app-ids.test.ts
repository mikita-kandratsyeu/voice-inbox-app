describe('firebase app check app ids', () => {
  const original = process.env.FIREBASE_APP_CHECK_APP_IDS;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.FIREBASE_APP_CHECK_APP_IDS;
    } else {
      process.env.FIREBASE_APP_CHECK_APP_IDS = original;
    }
    jest.resetModules();
  });

  it('allows any app id when env is unset', async () => {
    delete process.env.FIREBASE_APP_CHECK_APP_IDS;
    const mod = await import('./firebase-app-check-app-ids');
    expect(mod.isFirebaseAppCheckAppIdValidationEnabled()).toBe(false);
    expect(mod.isAllowedFirebaseAppCheckAppId('any-app')).toBe(true);
  });

  it('validates against configured app ids', async () => {
    process.env.FIREBASE_APP_CHECK_APP_IDS =
      '1:828265085007:ios:1e2559c39ffa5bdbced23a,1:828265085007:android:abc';
    const mod = await import('./firebase-app-check-app-ids');
    expect(mod.isFirebaseAppCheckAppIdValidationEnabled()).toBe(true);
    expect(mod.isAllowedFirebaseAppCheckAppId('1:828265085007:ios:1e2559c39ffa5bdbced23a')).toBe(
      true,
    );
    expect(mod.isAllowedFirebaseAppCheckAppId('other')).toBe(false);
  });
});
