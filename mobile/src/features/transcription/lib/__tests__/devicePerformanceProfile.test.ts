import { Platform } from 'react-native';

jest.mock('react-native-nitro-device-info', () => ({
  DeviceInfoModule: {
    getPowerState: jest.fn(),
    isLowBatteryLevel: jest.fn(),
  },
}));

import { DeviceInfoModule } from 'react-native-nitro-device-info';

import {
  detectDevicePerformanceTier,
  type DevicePerformanceProfile,
  getAdaptiveCheckpointInterval,
  getDevicePerformanceProfile,
} from '../devicePerformanceProfile';

describe('devicePerformanceProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (DeviceInfoModule.getPowerState as jest.Mock).mockReturnValue({ lowPowerMode: false });
    (DeviceInfoModule.isLowBatteryLevel as jest.Mock).mockReturnValue(false);
  });

  describe('detectDevicePerformanceTier', () => {
    it('should return medium tier for unknown platform', () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      const tier = detectDevicePerformanceTier();
      expect(tier).toBe('medium');
    });

    it('should detect iOS tier based on version as fallback', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      Object.defineProperty(Platform, 'Version', { value: '17.0', writable: true });

      const tier = detectDevicePerformanceTier();
      expect(tier).toBe('high');
    });

    it('should detect medium tier for iOS 15-16', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      Object.defineProperty(Platform, 'Version', { value: '15.0', writable: true });

      const tier = detectDevicePerformanceTier();
      expect(tier).toBe('medium');
    });

    it('should detect low tier for iOS < 15', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      Object.defineProperty(Platform, 'Version', { value: '14.0', writable: true });

      const tier = detectDevicePerformanceTier();
      expect(tier).toBe('low');
    });
  });

  describe('getDevicePerformanceProfile', () => {
    it('should return high performance profile for high tier device', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      Object.defineProperty(Platform, 'Version', { value: '17.0', writable: true });

      const profile = getDevicePerformanceProfile({ respectPowerMode: false });

      expect(profile.tier).toBe('high');
      expect(profile.optimalChunkDurationSec).toBe(30);
      expect(profile.contextRecycleChunks).toBe(15);
      expect(profile.checkpointIntervalMs).toBe(6000);
    });

    it('should downgrade tier when in low power mode', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      Object.defineProperty(Platform, 'Version', { value: '17.0', writable: true });
      (DeviceInfoModule.getPowerState as jest.Mock).mockReturnValue({ lowPowerMode: true });

      const profile = getDevicePerformanceProfile({ respectPowerMode: true });

      expect(profile.tier).toBe('medium');
      expect(profile.optimalChunkDurationSec).toBe(24);
    });

    it('should downgrade tier when battery is low', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      Object.defineProperty(Platform, 'Version', { value: '17.0', writable: true });
      (DeviceInfoModule.isLowBatteryLevel as jest.Mock).mockReturnValue(true);

      const profile = getDevicePerformanceProfile({ respectPowerMode: true });

      expect(profile.tier).toBe('medium');
    });

    it('should not downgrade tier when respectPowerMode is false', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      Object.defineProperty(Platform, 'Version', { value: '17.0', writable: true });
      (DeviceInfoModule.getPowerState as jest.Mock).mockReturnValue({ lowPowerMode: true });

      const profile = getDevicePerformanceProfile({ respectPowerMode: false });

      expect(profile.tier).toBe('high');
    });

    it('should handle power state detection failure gracefully', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      Object.defineProperty(Platform, 'Version', { value: '17.0', writable: true });
      (DeviceInfoModule.getPowerState as jest.Mock).mockImplementation(() => {
        throw new Error('Power state unavailable');
      });

      const profile = getDevicePerformanceProfile({ respectPowerMode: true });

      expect(profile.tier).toBe('high');
    });

    it('should progressively downgrade from high to low', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      Object.defineProperty(Platform, 'Version', { value: '15.0', writable: true });
      (DeviceInfoModule.getPowerState as jest.Mock).mockReturnValue({ lowPowerMode: true });

      const profile = getDevicePerformanceProfile({ respectPowerMode: true });

      expect(profile.tier).toBe('low');
    });
  });

  describe('getAdaptiveCheckpointInterval', () => {
    const baseProfile: DevicePerformanceProfile = {
      tier: 'medium',
      optimalChunkDurationSec: 24,
      optimalChunkOverlapSec: 3,
      checkpointIntervalMs: 4000,
      contextRecycleChunks: 12,
    };

    it('should return base interval for short audio (< 2 min)', () => {
      const interval = getAdaptiveCheckpointInterval(60 * 1000, baseProfile);
      expect(interval).toBe(4000);
    });

    it('should increase by 50% for 2-10 minute audio', () => {
      const interval = getAdaptiveCheckpointInterval(5 * 60 * 1000, baseProfile);
      expect(interval).toBe(6000); // 4000 * 1.5
    });

    it('should increase by 100% for 10-30 minute audio', () => {
      const interval = getAdaptiveCheckpointInterval(15 * 60 * 1000, baseProfile);
      expect(interval).toBe(8000); // 4000 * 2
    });

    it('should increase by 150% for audio > 30 minutes', () => {
      const interval = getAdaptiveCheckpointInterval(45 * 60 * 1000, baseProfile);
      expect(interval).toBe(10000); // 4000 * 2.5
    });

    it('should scale with different base intervals', () => {
      const highProfile: DevicePerformanceProfile = {
        ...baseProfile,
        checkpointIntervalMs: 6000,
      };

      const interval = getAdaptiveCheckpointInterval(45 * 60 * 1000, highProfile);
      expect(interval).toBe(15000); // 6000 * 2.5
    });

    it('should handle edge cases at boundaries', () => {
      expect(getAdaptiveCheckpointInterval(2 * 60 * 1000 - 1, baseProfile)).toBe(4000);
      expect(getAdaptiveCheckpointInterval(2 * 60 * 1000, baseProfile)).toBe(6000);
      expect(getAdaptiveCheckpointInterval(10 * 60 * 1000 - 1, baseProfile)).toBe(6000);
      expect(getAdaptiveCheckpointInterval(10 * 60 * 1000, baseProfile)).toBe(8000);
      expect(getAdaptiveCheckpointInterval(30 * 60 * 1000 - 1, baseProfile)).toBe(8000);
      expect(getAdaptiveCheckpointInterval(30 * 60 * 1000, baseProfile)).toBe(10000);
    });
  });
});
