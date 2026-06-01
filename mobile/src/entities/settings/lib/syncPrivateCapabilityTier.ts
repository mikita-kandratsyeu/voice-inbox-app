import { useSettingsStore } from '../model/store';
import { canEnablePrivateMode, resolvePrivateAiCapabilityTier } from './privateAiCapability';

export function syncPrivateCapabilityTier(): void {
  const { tier } = resolvePrivateAiCapabilityTier();
  const store = useSettingsStore.getState();
  store.setPrivateCapabilityTier(tier);
  if (!canEnablePrivateMode(tier) && store.aiExecutionMode === 'private_experimental') {
    store.setAiExecutionMode('smart_hybrid');
  }
}
