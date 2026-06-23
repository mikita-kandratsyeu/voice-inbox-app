jest.mock('@/entities/settings', () => ({
  isPrivateCustomServerMode: (
    aiExecutionMode: 'smart_hybrid' | 'private_experimental',
    privateAiProvider: 'local' | 'custom_openai',
    isProActive = true,
  ) =>
    aiExecutionMode === 'private_experimental' &&
    privateAiProvider === 'custom_openai' &&
    isProActive,
}));

jest.mock('@/features/pro-license/lib/proEntitlementStorage', () => ({
  isProActiveFromStorageSync: jest.fn(() => true),
}));

import { isInboxAskAvailable } from '../isInboxAskAvailable';

describe('isInboxAskAvailable', () => {
  it('allows Smart mode', () => {
    expect(isInboxAskAvailable('smart_hybrid', 'local', true)).toBe(true);
    expect(isInboxAskAvailable('smart_hybrid', 'custom_openai', false)).toBe(true);
  });

  it('allows Private mode only with Pro and custom OpenAI server', () => {
    expect(isInboxAskAvailable('private_experimental', 'custom_openai', true)).toBe(true);
  });

  it('blocks Private on-device and Private server without Pro', () => {
    expect(isInboxAskAvailable('private_experimental', 'local', true)).toBe(false);
    expect(isInboxAskAvailable('private_experimental', 'custom_openai', false)).toBe(false);
  });
});
