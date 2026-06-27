import { Haptics } from 'react-native-nitro-haptics';

import { devWarn } from '@/shared/lib/appLogger';

const trigger = (fn: () => void) => {
  try {
    fn();
  } catch {
    devWarn('Haptic feedback failed');
  }
};

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

export const hapticError = () => {
  trigger(() => Haptics.notification('error'));
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
