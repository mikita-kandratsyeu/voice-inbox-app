import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

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
    console.warn('Haptic feedback failed');
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
