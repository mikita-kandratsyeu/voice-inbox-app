import { Platform } from 'react-native';

export const IS_IOS = Platform.OS === 'ios';
export const IS_ANDROID = Platform.OS === 'android';
export const IS_WEB = Platform.OS === 'web';
export const PLATFORM_OS = Platform.OS;
export const keyboardAvoidingBehavior = IS_IOS ? ('padding' as const) : ('height' as const);
export const keyboardVerticalOffset = IS_IOS ? 0 : 0;
export const modalKeyboardBehavior = IS_IOS ? ('interactive' as const) : ('fillParent' as const);

export function getIosVersion(): number {
  if (!IS_IOS) {
    return 0;
  }

  const v = parseInt(String(Platform.Version).split('.')[0], 10);

  return Number.isNaN(v) ? 0 : v;
}
