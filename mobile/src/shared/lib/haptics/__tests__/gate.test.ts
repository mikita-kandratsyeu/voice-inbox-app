import { shouldReduceMotion } from '@/shared/config/animations';
import { storage } from '@/shared/lib/async-storage';

import {
  getEffectiveHapticsIntensity,
  getStoredHapticsIntensity,
  writeHapticsIntensity,
} from '../gate';

jest.mock('@/shared/lib/async-storage', () => ({
  storage: {
    getString: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('@/shared/config/animations', () => ({
  shouldReduceMotion: jest.fn(() => false),
}));

describe('haptics gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(shouldReduceMotion).mockReturnValue(false);
  });

  it('defaults stored intensity to full', () => {
    jest.mocked(storage.getString).mockReturnValue(undefined);
    expect(getStoredHapticsIntensity()).toBe('full');
  });

  it('reads stored intensity', () => {
    jest.mocked(storage.getString).mockReturnValue('subtle');
    expect(getStoredHapticsIntensity()).toBe('subtle');
  });

  it('forces subtle when reduce motion is enabled', () => {
    jest.mocked(storage.getString).mockReturnValue('full');
    jest.mocked(shouldReduceMotion).mockReturnValue(true);
    expect(getEffectiveHapticsIntensity()).toBe('subtle');
  });

  it('returns off when stored intensity is off', () => {
    jest.mocked(storage.getString).mockReturnValue('off');
    expect(getEffectiveHapticsIntensity()).toBe('off');
  });

  it('persists intensity updates', () => {
    writeHapticsIntensity('subtle');
    expect(storage.set).toHaveBeenCalledWith('settings.hapticsIntensity', 'subtle');
  });
});
