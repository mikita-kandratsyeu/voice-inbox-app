import { getExperimentalPrivateAiEnabled } from '@/shared/config/runtimeConfig';

import { useSettingsStore } from '../model/store';
import { resolvePrivateAiCapabilityTier } from './privateAiCapability';

export function syncPrivateCapabilityTier(): void {
  if (!getExperimentalPrivateAiEnabled()) {
    useSettingsStore.getState().setPrivateCapabilityTier('unavailable');
    return;
  }

  const { tier } = resolvePrivateAiCapabilityTier();
  useSettingsStore.getState().setPrivateCapabilityTier(tier);
}
