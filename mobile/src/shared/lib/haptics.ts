import { AppState } from 'react-native';
import { Haptics } from 'react-native-nitro-haptics';

import { devWarn } from '@/shared/lib/appLogger';

const trigger = (fn: () => void) => {
  if (AppState.currentState !== 'active') {
    return;
  }
  try {
    fn();
  } catch {
    devWarn('Haptic feedback failed');
  }
};

export const canPlayHaptic = (): boolean => AppState.currentState === 'active';

export const canPlayAmbientHaptic = (): boolean => canPlayHaptic();

export const hapticSelection = () => {
  trigger(() => Haptics.selection());
};

export const hapticLight = () => {
  trigger(() => Haptics.impact('light'));
};

export const hapticMedium = () => {
  trigger(() => Haptics.impact('medium'));
};

export const hapticSuccess = () => {
  trigger(() => Haptics.notification('success'));
};

export const hapticSuccessMajor = () => {
  trigger(() => Haptics.notification('success'));
};

export const hapticError = () => {
  trigger(() => Haptics.notification('error'));
};

export const hapticWarning = () => {
  trigger(() => Haptics.notification('warning'));
};

export const hapticRecordingStart = () => {
  trigger(() => Haptics.impact('medium'));
};

export const hapticRecordingPause = () => {
  trigger(() => Haptics.impact('light'));
};

export const hapticRecordingResume = () => {
  trigger(() => Haptics.selection());
};

export const hapticRecordingLimitWarning = (final: boolean) => {
  trigger(() => Haptics.impact(final ? 'medium' : 'light'));
};

/** Pin moment / secondary recording controls. */
export const hapticRecordingControl = () => {
  trigger(() => Haptics.impact('medium'));
};

/** Opens save sheet — success haptic fires on confirm. */
export const hapticRecordingFinishIntent = () => {
  trigger(() => Haptics.impact('light'));
};

export const hapticPlaybackMarkCrossed = () => {
  trigger(() => Haptics.selection());
};

export const hapticTranscriptionProcessingStart = () => {
  trigger(() => Haptics.impact('light'));
};

export const hapticTranscriptionChunk = () => {
  trigger(() => Haptics.selection());
};

export const hapticTranscriptionComplete = () => {
  trigger(() => Haptics.notification('success'));
};

export const hapticTranscriptionFailed = () => {
  trigger(() => Haptics.notification('error'));
};

export const hapticPinKey = () => {
  trigger(() => Haptics.impact('light'));
};

export const hapticPinSuccess = () => {
  trigger(() => Haptics.notification('success'));
};

export const hapticPinError = () => {
  trigger(() => Haptics.notification('error'));
};

export const hapticShakeDetect = () => {
  trigger(() => Haptics.impact('medium'));
};

export const hapticRecordTabPress = () => {
  trigger(() => Haptics.impact('light'));
};

export const hapticSwipeCommit = () => {
  trigger(() => Haptics.impact('medium'));
};
