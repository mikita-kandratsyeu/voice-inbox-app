jest.mock('@/shared/config/animations', () => ({
  shouldReduceMotion: jest.fn(() => false),
}));

jest.mock('../gate', () => ({
  supportsRichHapticEngine: jest.fn(() => true),
}));

jest.mock('react-native-pulsar', () => ({
  Presets: {
    bloom: jest.fn(),
    System: {
      impactLight: jest.fn(),
      impactMedium: jest.fn(),
      selection: jest.fn(),
    },
  },
}));

import { Presets } from 'react-native-pulsar';

import { supportsRichHapticEngine } from '../gate';
import { previewHapticsIntensity } from '../previewIntensity';

describe('previewHapticsIntensity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(supportsRichHapticEngine).mockReturnValue(true);
  });

  it('plays nothing for off', () => {
    previewHapticsIntensity('off');
    expect(Presets.bloom).not.toHaveBeenCalled();
    expect(Presets.System.impactLight).not.toHaveBeenCalled();
  });

  it('plays system light for subtle', () => {
    previewHapticsIntensity('subtle');
    expect(Presets.System.impactLight).toHaveBeenCalled();
    expect(Presets.bloom).not.toHaveBeenCalled();
  });

  it('plays rich bloom for full when engine supports it', () => {
    previewHapticsIntensity('full');
    expect(Presets.bloom).toHaveBeenCalled();
    expect(Presets.System.impactMedium).not.toHaveBeenCalled();
  });

  it('falls back to system medium for full without rich engine', () => {
    jest.mocked(supportsRichHapticEngine).mockReturnValue(false);
    previewHapticsIntensity('full');
    expect(Presets.System.impactMedium).toHaveBeenCalled();
    expect(Presets.bloom).not.toHaveBeenCalled();
  });
});
