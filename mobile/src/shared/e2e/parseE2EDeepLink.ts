const E2E_PREFIX = 'voiceinbox://e2e/';

export type E2EDeepLinkAction =
  | {
      type: 'reset';
      mockPro: boolean;
      disableAds: boolean;
      skipOnboarding: boolean;
      skipAppLock: boolean;
    }
  | { type: 'seed-text-note'; title?: string; body?: string; id?: string };

function parseBoolParam(value: string | null, defaultValue: boolean): boolean {
  if (value == null || value.trim() === '') return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === '0' || normalized === 'false' || normalized === 'no') return false;
  return true;
}

export function tryParseE2EDeepLink(rawUrl: string): E2EDeepLinkAction | null {
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith(E2E_PREFIX)) {
    return null;
  }

  const [pathPart, queryPart] = trimmed.split('?', 2);
  const path = pathPart.replace(/\/+$/, '');
  const params = new URLSearchParams(queryPart?.split('#')[0] ?? '');

  if (path === `${E2E_PREFIX}reset` || path === 'voiceinbox:/e2e/reset') {
    return {
      type: 'reset',
      skipOnboarding: parseBoolParam(params.get('skipOnboarding'), true),
      skipAppLock: parseBoolParam(params.get('skipAppLock'), true),
      mockPro: parseBoolParam(params.get('mockPro'), false),
      disableAds: parseBoolParam(params.get('disableAds'), true),
    };
  }

  if (path === `${E2E_PREFIX}seed-text-note` || path === 'voiceinbox:/e2e/seed-text-note') {
    return {
      type: 'seed-text-note',
      title: params.get('title') ?? undefined,
      body: params.get('body') ?? undefined,
      id: params.get('id') ?? undefined,
    };
  }

  return null;
}
