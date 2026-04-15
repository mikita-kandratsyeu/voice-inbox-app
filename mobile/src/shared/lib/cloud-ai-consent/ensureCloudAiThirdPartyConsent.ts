import { useSettingsStore } from '@/entities/settings';

import { useCloudAiConsentUiStore } from './cloudAiConsentUiStore';

let inFlight: Promise<boolean> | null = null;

export function ensureCloudAiThirdPartyConsent(): Promise<boolean> {
  if (useSettingsStore.getState().cloudAiThirdPartyConsentAccepted) {
    return Promise.resolve(true);
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = new Promise<boolean>((resolve) => {
    useCloudAiConsentUiStore.getState().open(resolve);
  }).finally(() => {
    inFlight = null;
  });

  return inFlight;
}
