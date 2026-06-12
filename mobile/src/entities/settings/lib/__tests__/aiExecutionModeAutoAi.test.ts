jest.mock('@/shared/config', () => ({
  parseAccentColorId: () => 'blue',
}));

jest.mock('react-native-reanimated', () => ({
  Easing: {},
}));

jest.mock('@/shared/lib/async-storage', () => {
  const map = new Map<string, string>();
  (globalThis as { __settingsTestStorageMap?: Map<string, string> }).__settingsTestStorageMap = map;
  return {
    storage: {
      getString: (key: string) => map.get(key),
      set: (key: string, value: string) => {
        map.set(key, value);
      },
      remove: (key: string) => {
        map.delete(key);
      },
      contains: (key: string) => map.has(key),
    },
  };
});

jest.mock('@/features/pro-license/lib/proEntitlementStorage', () => ({
  isProActiveFromStorageSync: () => true,
}));

jest.mock('@/shared/lib/ai-core/localLlmSession', () => ({
  releaseLocalLlmSession: jest.fn(),
}));

import { useSettingsStore } from '../../model/store';

const testStorageMap = (globalThis as unknown as { __settingsTestStorageMap: Map<string, string> })
  .__settingsTestStorageMap;

describe('setAiExecutionMode autoAiAfterTranscription', () => {
  beforeEach(() => {
    testStorageMap.clear();
    testStorageMap.set('settings.aiExecutionMode', 'smart_hybrid');
    testStorageMap.set('settings.privateCapabilityTier', 'full');
    useSettingsStore.setState({
      aiExecutionMode: 'smart_hybrid',
      autoAiAfterTranscription: false,
      autoTranscribeOnSave: false,
      autoArchiveEnabled: false,
      privateCapabilityTier: 'full',
    });
  });

  it('preserves private auto-summary when switching private → smart → private', () => {
    useSettingsStore.getState().setAiExecutionMode('private_experimental');
    expect(useSettingsStore.getState().autoAiAfterTranscription).toBe(false);

    useSettingsStore.getState().setAutoAiAfterTranscription(true);
    expect(useSettingsStore.getState().autoAiAfterTranscription).toBe(true);
    expect(testStorageMap.get('settings.private.autoAiAfterTranscription')).toBe('true');

    useSettingsStore.getState().setAiExecutionMode('smart_hybrid');
    expect(useSettingsStore.getState().autoAiAfterTranscription).toBe(false);

    useSettingsStore.getState().setAiExecutionMode('private_experimental');
    expect(useSettingsStore.getState().autoAiAfterTranscription).toBe(true);
  });

  it('restores smart auto-summary without overwriting private preference', () => {
    useSettingsStore.setState({ autoAiAfterTranscription: true });
    testStorageMap.set('settings.autoAiAfterTranscription', 'true');

    useSettingsStore.getState().setAiExecutionMode('private_experimental');
    useSettingsStore.getState().setAutoAiAfterTranscription(false);

    useSettingsStore.getState().setAiExecutionMode('smart_hybrid');
    expect(useSettingsStore.getState().autoAiAfterTranscription).toBe(true);

    useSettingsStore.getState().setAiExecutionMode('private_experimental');
    expect(useSettingsStore.getState().autoAiAfterTranscription).toBe(false);
  });
});
