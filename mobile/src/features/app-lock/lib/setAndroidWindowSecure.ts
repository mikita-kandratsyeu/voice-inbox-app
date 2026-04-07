import { NativeModules } from 'react-native';

import { IS_ANDROID } from '@/shared/lib';

type SecureWindowNative = {
  setSecure: (secure: boolean) => void;
};

export function setAndroidWindowSecure(secure: boolean): void {
  if (!IS_ANDROID) {
    return;
  }

  const mod = NativeModules.SecureWindow as SecureWindowNative | undefined;
  mod?.setSecure(secure);
}
