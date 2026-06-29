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
      impactMedium: jest.fn(),
      notificationSuccess: jest.fn(),
    },
  },
  Settings: {
    getHapticsSupportLevel: jest.fn(() => 3),
  },
  HapticSupport: {
    NO_SUPPORT: 0,
    LIMITED_SUPPORT: 1,
    STANDARD_SUPPORT: 2,
    ADVANCED_SUPPORT: 3,
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

  it('keeps system selection in full mode for frequent UI taps', () => {
    playSemantic('selection');
    expect(Presets.ping).not.toHaveBeenCalled();
    expect(Presets.System.selection).toHaveBeenCalled();
  });

  it('plays rich semantic presets for expressive milestones in full mode', () => {
    playSemantic('successSubtle');
    expect(Presets.bloom).toHaveBeenCalled();
    expect(Presets.System.notificationSuccess).not.toHaveBeenCalled();
  });

  it('plays system semantic presets in subtle mode', () => {
    jest.mocked(getEffectiveHapticsIntensity).mockReturnValue('subtle');
    playSemantic('selection');
    expect(Presets.System.selection).toHaveBeenCalled();
  });

  it('plays domain presets in full mode', () => {
    playDomain('recordingStart');
    expect(Presets.charge).toHaveBeenCalled();
    expect(Presets.System.impactMedium).not.toHaveBeenCalled();
  });

  it('keeps record tab press on system haptics in full mode', () => {
    playDomain('recordTabPress');
    expect(Presets.charge).not.toHaveBeenCalled();
    expect(Presets.System.impactLight).toHaveBeenCalled();
  });

  it('skips playback when haptics are disabled', () => {
    jest.mocked(canPlayHaptic).mockReturnValue(false);
    playSemantic('successSubtle');
    expect(Presets.bloom).not.toHaveBeenCalled();
  });
});
