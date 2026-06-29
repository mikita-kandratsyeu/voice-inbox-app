import { playDomain, playSemantic } from './designSystem';
import { getEffectiveHapticsIntensity } from './gate';

export {
  canPlayAmbientHaptic,
  canPlayHaptic,
  getEffectiveHapticsIntensity,
  getStoredHapticsIntensity,
  isFullHapticsProfile,
  supportsRichHapticEngine,
} from './gate';
export { initPulsarHaptics } from './preload';
export type { HapticsIntensity } from './types';
export { DEFAULT_HAPTICS_INTENSITY, HAPTICS_INTENSITY_STORAGE_KEY } from './types';

/** Gesture swipe commit — JS thread only (Pulsar is not worklet-safe). */
export const hapticGestureSwipe = (): void => {
  const intensity = getEffectiveHapticsIntensity();
  if (intensity === 'off') {
    return;
  }
  if (intensity === 'full') {
    playDomain('swipeCommit');
    return;
  }
  playSemantic('light');
};

/** Graph node drag grab — JS thread only. */
export const hapticGraphGrab = (): void => {
  playSemantic('light');
};

/** Graph node snap lock — JS thread only, full profile only. */
export const hapticGraphLock = (): void => {
  if (getEffectiveHapticsIntensity() !== 'full') {
    return;
  }
  playDomain('pinSuccess');
};

export const hapticSelection = () => playSemantic('selection');

export const hapticLight = () => playSemantic('light');

export const hapticMedium = () => playSemantic('medium');

export const hapticSuccess = () => playSemantic('successSubtle');

export const hapticSuccessMajor = () => playSemantic('successMajor');

export const hapticError = () => playSemantic('error');

export const hapticWarning = () => playSemantic('warning');

export const hapticRecordingStart = () => playDomain('recordingStart');

export const hapticRecordingPause = () => playDomain('recordingPause');

export const hapticRecordingResume = () => playDomain('recordingResume');

export const hapticRecordingLimitWarning = (final: boolean) =>
  playDomain(final ? 'recordingLimitFinal' : 'recordingLimitWarning');

export const hapticRecordingControl = () => playDomain('recordingControl');

export const hapticRecordingFinishIntent = () => playDomain('recordingFinishIntent');

export const hapticPlaybackMarkCrossed = () => playDomain('playbackMarkCrossed');

export const hapticTranscriptionProcessingStart = () => playDomain('transcriptionProcessingStart');

export const hapticTranscriptionChunk = () => playDomain('transcriptionChunk');

export const hapticTranscriptionComplete = () => playDomain('transcriptionComplete');

export const hapticTranscriptionFailed = () => playDomain('transcriptionFailed');

export const hapticPinKey = () => playDomain('pinKey');

export const hapticPinSuccess = () => playDomain('pinSuccess');

export const hapticPinError = () => playDomain('pinError');

export const hapticShakeDetect = () => playDomain('shakeDetect');

export const hapticRecordTabPress = () => playDomain('recordTabPress');

export const hapticSwipeCommit = () => playDomain('swipeCommit');
