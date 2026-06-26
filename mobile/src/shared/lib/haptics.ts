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
