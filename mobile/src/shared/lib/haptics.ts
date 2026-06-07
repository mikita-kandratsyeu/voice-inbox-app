import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import { devWarn } from '@/shared/lib/appLogger';

type HapticType =
  | 'selection'
  | 'impactLight'
  | 'impactMedium'
  | 'notificationSuccess'
  | 'notificationError';

const trigger = (type: HapticType) => {
  try {
    ReactNativeHapticFeedback.trigger(type, { enableVibrateFallback: true });
  } catch {
    devWarn('Haptic feedback failed');
  }
};

export const hapticSelection = () => {
  trigger('selection');
};

export const hapticLight = () => {
  trigger('impactLight');
};

export const hapticMedium = () => {
  trigger('impactMedium');
};

export const hapticSuccess = () => {
  trigger('notificationSuccess');
};

export const hapticError = () => {
  trigger('notificationError');
};
