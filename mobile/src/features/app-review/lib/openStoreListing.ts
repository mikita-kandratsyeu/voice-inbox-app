import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@env';
import { Linking } from 'react-native';

import { IS_ANDROID, IS_IOS } from '@/shared/lib/platform';
import { isString } from '@/shared/lib/type-guards';

function pickStoreUrl(): string | null {
  const ios = APP_STORE_URL?.trim();
  const android = GOOGLE_PLAY_URL?.trim();

  if (IS_IOS && isString(ios) && ios.length > 0) {
    return ios;
  }

  if (IS_ANDROID && isString(android) && android.length > 0) {
    return android;
  }

  return null;
}

export async function openStoreListing(): Promise<boolean> {
  const url = pickStoreUrl();

  if (!url) {
    return false;
  }

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      return false;
    }

    await Linking.openURL(url);

    return true;
  } catch {
    return false;
  }
}
