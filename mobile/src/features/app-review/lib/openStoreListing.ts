import { Linking } from 'react-native';

import { getAppStoreUrl, getGooglePlayUrl } from '@/shared/config/runtimeConfig';
import { IS_ANDROID, IS_IOS } from '@/shared/lib/platform';
import { isString } from '@/shared/lib/type-guards';

function pickStoreUrl(): string | null {
  const ios = getAppStoreUrl().trim();
  const android = getGooglePlayUrl().trim();

  if (IS_IOS && isString(ios) && ios.length > 0) {
    return ios;
  }

  if (IS_ANDROID && isString(android) && android.length > 0) {
    return android;
  }

  return null;
}

/** Resolves the store listing URL for the current platform, if configured in env. */
export function getStoreListingUrl(): string | null {
  return pickStoreUrl();
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
