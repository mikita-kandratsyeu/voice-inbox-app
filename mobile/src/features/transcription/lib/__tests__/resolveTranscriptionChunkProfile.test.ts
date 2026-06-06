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
  });

  it('uses the normal profile when power state is healthy', () => {
    expect(resolveTranscriptionChunkProfile()).toEqual({
      chunkDurationSec: 24,
      chunkOverlapSec: 3,
    });
  });

  it('uses the conservative profile in low power mode', () => {
    mockGetPowerState.mockReturnValue({
      lowPowerMode: true,
      batteryLevel: 0.8,
      batteryState: 'unplugged',
    });

    expect(resolveTranscriptionChunkProfile()).toEqual({
      chunkDurationSec: 18,
      chunkOverlapSec: 3,
    });
  });

  it('falls back to the normal profile when device info is unavailable', () => {
    mockGetPowerState.mockImplementation(() => {
      throw new Error('device info unavailable');
    });

    expect(resolveTranscriptionChunkProfile()).toEqual({
      chunkDurationSec: 24,
      chunkOverlapSec: 3,
    });
  });
});
