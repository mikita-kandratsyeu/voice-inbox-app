jest.mock('@/shared/lib/appLogger', () => ({
  devWarn: jest.fn(),
}));

jest.mock('../gate', () => ({
  canPlayHaptic: jest.fn(() => true),
  getEffectiveHapticsIntensity: jest.fn(() => 'full'),
}));

jest.mock('react-native-pulsar', () => ({
  Presets: {
    ping: jest.fn(),
    bloom: jest.fn(),
    charge: jest.fn(),
    System: {
      selection: jest.fn(),
      impactLight: jest.fn(),
      notificationSuccess: jest.fn(),
    },
  },
}));

import { Presets } from 'react-native-pulsar';

import { playDomain, playSemantic } from '../designSystem';
import { canPlayHaptic, getEffectiveHapticsIntensity } from '../gate';

describe('haptics designSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getEffectiveHapticsIntensity).mockReturnValue('full');
    jest.mocked(canPlayHaptic).mockReturnValue(true);
  });

  it('plays rich semantic presets in full mode', () => {
    playSemantic('selection');
    expect(Presets.ping).toHaveBeenCalled();
  });

  it('plays system semantic presets in subtle mode', () => {
    jest.mocked(getEffectiveHapticsIntensity).mockReturnValue('subtle');
    playSemantic('selection');
    expect(Presets.System.selection).toHaveBeenCalled();
  });

  it('plays domain presets in full mode', () => {
    playDomain('recordingStart');
    expect(Presets.charge).toHaveBeenCalled();
  });

  it('skips playback when haptics are disabled', () => {
    jest.mocked(canPlayHaptic).mockReturnValue(false);
    playSemantic('successSubtle');
    expect(Presets.bloom).not.toHaveBeenCalled();
  });
});
