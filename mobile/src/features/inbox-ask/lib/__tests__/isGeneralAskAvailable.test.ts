import { describe, expect, it } from '@jest/globals';

import { isGeneralAskAvailable } from '../isGeneralAskAvailable';

describe('isGeneralAskAvailable', () => {
  it('allows smart mode when online', () => {
    expect(isGeneralAskAvailable('smart_hybrid', 'local', true)).toBe(true);
  });

  it('blocks smart mode when offline', () => {
    expect(isGeneralAskAvailable('smart_hybrid', 'local', false)).toBe(false);
  });

  it('allows private remote server', () => {
    expect(isGeneralAskAvailable('private_experimental', 'custom_openai', false)).toBe(true);
  });

  it('blocks on-device private mode', () => {
    expect(isGeneralAskAvailable('private_experimental', 'local', true)).toBe(false);
  });
});
