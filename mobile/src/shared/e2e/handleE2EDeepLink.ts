import { diagWarn } from '@/shared/lib/appLogger';

import { applyE2EConfig, resetE2EState } from './applyE2EConfig';
import { isE2EAllowed } from './isE2EAllowed';
import { tryParseE2EDeepLink } from './parseE2EDeepLink';
import { seedTextNoteForE2E } from './seedTextNote';

export async function handleE2EDeepLink(rawUrl: string): Promise<boolean> {
  if (!isE2EAllowed()) {
    return false;
  }

  const action = tryParseE2EDeepLink(rawUrl);
  if (!action) {
    return false;
  }

  try {
    if (action.type === 'reset') {
      await resetE2EState({
        skipOnboarding: action.skipOnboarding,
        skipAppLock: action.skipAppLock,
        mockPro: action.mockPro,
        disableAds: action.disableAds,
        prepareSkipUi: action.prepareSkipUi,
      });
      return true;
    }

    if (action.type === 'seed-text-note') {
      await applyE2EConfig({ skipOnboarding: true, skipAppLock: true, disableAds: true });
      await seedTextNoteForE2E({
        title: action.title,
        body: action.body,
        id: action.id,
      });
      return true;
    }
  } catch (e) {
    diagWarn('[e2e] deep link failed', { url: rawUrl }, e);
  }

  return true;
}
