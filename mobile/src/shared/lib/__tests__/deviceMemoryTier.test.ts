const platformMock = { IS_ANDROID: false, IS_IOS: true };
const deviceInfoMock = {
  totalMemory: 4 * 1024 * 1024 * 1024,
  isLowRamDevice: false,
};

jest.mock('react-native-nitro-device-info', () => ({
  DeviceInfoModule: deviceInfoMock,
}));

jest.mock('@/shared/lib/platform', () => platformMock);

import { readTotalRamMb, resolveDeviceMemoryTier } from '../deviceMemoryTier';

const setTotalRamMb = (mb: number) => {
  deviceInfoMock.totalMemory = mb * 1024 * 1024;
};

describe('deviceMemoryTier', () => {
  beforeEach(() => {
    setTotalRamMb(4096);
    deviceInfoMock.isLowRamDevice = false;
    platformMock.IS_ANDROID = false;
  });

  describe('readTotalRamMb', () => {
    it('converts bytes to megabytes', () => {
      setTotalRamMb(6144);
      expect(readTotalRamMb()).toBe(6144);
    });

    it('returns null for invalid values', () => {
      deviceInfoMock.totalMemory = 0;
      expect(readTotalRamMb()).toBeNull();
    });
  });

  describe('resolveDeviceMemoryTier', () => {
    it('returns low for Android low-RAM devices', () => {
      platformMock.IS_ANDROID = true;
      deviceInfoMock.isLowRamDevice = true;
      setTotalRamMb(8192);

      expect(resolveDeviceMemoryTier()).toBe('low');
    });

    it('maps RAM thresholds like Whisper recommendation', () => {
      setTotalRamMb(2000);
      expect(resolveDeviceMemoryTier()).toBe('low');

      setTotalRamMb(3000);
      expect(resolveDeviceMemoryTier()).toBe('medium');

      setTotalRamMb(5000);
      expect(resolveDeviceMemoryTier()).toBe('high');

      setTotalRamMb(8000);
      expect(resolveDeviceMemoryTier()).toBe('ultra');
    });
  });
});
