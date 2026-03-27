import { isExperimentalPrivateAiEnabled } from '@/shared/config/buildEnv';

import { useSettingsStore } from '../model/store';
import { resolvePrivateAiCapabilityTier } from './privateAiCapability';

export function syncPrivateCapabilityTier(): void {
  if (!isExperimentalPrivateAiEnabled()) {
    useSettingsStore.getState().setPrivateCapabilityTier('unavailable');
    return;
  }

  const { tier } = resolvePrivateAiCapabilityTier();
  useSettingsStore.getState().setPrivateCapabilityTier(tier);
}
