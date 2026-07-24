import { hapticLight, hapticPlaybackMarkCrossed, hapticSelection } from '@/shared/lib';

import { AudioPlayerScrubHapticFeedback } from '../audioPlayerScrubHaptics';

jest.mock('@/shared/lib', () => ({
  hapticLight: jest.fn(),
  hapticPlaybackMarkCrossed: jest.fn(),
  hapticSelection: jest.fn(),
}));

describe('AudioPlayerScrubHapticFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fires light haptic on scrub start and end', () => {
    const feedback = new AudioPlayerScrubHapticFeedback([]);
    feedback.onStart(0);
    feedback.onEnd();

    expect(hapticLight).toHaveBeenCalledTimes(2);
  });

  it('fires selection haptic when crossing whole seconds', () => {
    const feedback = new AudioPlayerScrubHapticFeedback([]);
    feedback.onStart(0);
    feedback.onMove(1000, 0);
    feedback.onMove(2500, 1000);

    expect(hapticSelection).toHaveBeenCalledTimes(2);
  });

  it('fires mark haptic when crossing playback marks', () => {
    const feedback = new AudioPlayerScrubHapticFeedback([1500, 4000]);
    feedback.onStart(0);
    feedback.onMove(1600, 0);

    expect(hapticPlaybackMarkCrossed).toHaveBeenCalledTimes(1);
  });
});
