import { Platform } from 'react-native';

jest.mock('react-native-nitro-device-info', () => ({
  DeviceInfoModule: {
    getPowerState: jest.fn(),
    isLowBatteryLevel: jest.fn(),
  },
}));

import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { resolveTranscriptionChunkProfile } from '../resolveTranscriptionChunkProfile';

const mockGetPowerState = jest.mocked(DeviceInfoModule.getPowerState);
const mockIsLowBatteryLevel = jest.mocked(DeviceInfoModule.isLowBatteryLevel);

describe('resolveTranscriptionChunkProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPowerState.mockReturnValue({
      lowPowerMode: false,
      batteryLevel: 0.8,
      batteryState: 'unplugged',
    });
    mockIsLowBatteryLevel.mockReturnValue(false);
    // Default to medium-tier device (iOS 15-16)
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
    Object.defineProperty(Platform, 'Version', {
      value: '15.0',
      writable: true,
      configurable: true,
    });
  });

  it('uses device-appropriate profile for medium tier', () => {
    expect(resolveTranscriptionChunkProfile('balanced')).toEqual({
      chunkDurationSec: 45,
      chunkOverlapSec: 4,
    });
  });

  it('uses high-performance profile for high-tier devices', () => {
    Object.defineProperty(Platform, 'Version', {
      value: '17.0',
      writable: true,
      configurable: true,
    });

    expect(resolveTranscriptionChunkProfile('balanced')).toEqual({
      chunkDurationSec: 60,
      chunkOverlapSec: 5,
    });
  });

  it('uses conservative profile for low-tier devices', () => {
    Object.defineProperty(Platform, 'Version', {
      value: '14.0',
      writable: true,
      configurable: true,
    });

    expect(resolveTranscriptionChunkProfile('balanced')).toEqual({
      chunkDurationSec: 30,
      chunkOverlapSec: 3,
    });
  });

  it('downgrades profile when in low power mode', () => {
    Object.defineProperty(Platform, 'Version', {
      value: '17.0',
      writable: true,
      configurable: true,
    });
    mockGetPowerState.mockReturnValue({
      lowPowerMode: true,
      batteryLevel: 0.8,
      batteryState: 'unplugged',
    });

    // High tier downgraded to medium due to low power mode
    expect(resolveTranscriptionChunkProfile('balanced')).toEqual({
      chunkDurationSec: 45,
      chunkOverlapSec: 4,
    });
  });

  it('downgrades profile when battery is low', () => {
    Object.defineProperty(Platform, 'Version', {
      value: '17.0',
      writable: true,
      configurable: true,
    });
    mockIsLowBatteryLevel.mockReturnValue(true);

    // High tier downgraded to medium due to low battery
    expect(resolveTranscriptionChunkProfile('balanced')).toEqual({
      chunkDurationSec: 45,
      chunkOverlapSec: 4,
    });
  });

  it('falls back gracefully when device info is unavailable', () => {
    mockGetPowerState.mockImplementation(() => {
      throw new Error('device info unavailable');
    });

    // Should still return a valid profile (medium tier fallback)
    const profile = resolveTranscriptionChunkProfile('balanced');
    expect(profile).toHaveProperty('chunkDurationSec');
    expect(profile).toHaveProperty('chunkOverlapSec');
    expect(profile.chunkDurationSec).toBeGreaterThan(0);
  });
});
