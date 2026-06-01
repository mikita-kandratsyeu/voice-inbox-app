import { useSettingsStore } from '../model/store';
import { resolvePrivateAiCapabilityTier } from './privateAiCapability';

export function syncPrivateCapabilityTier(): void {
  const { tier } = resolvePrivateAiCapabilityTier();
  useSettingsStore.getState().setPrivateCapabilityTier(tier);
}
