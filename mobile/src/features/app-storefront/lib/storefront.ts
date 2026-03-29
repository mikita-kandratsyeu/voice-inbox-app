import { NativeModules } from 'react-native';

type StorefrontNative = {
  getCountryCode: () => Promise<string | null | undefined>;
  showManageSubscriptions?: () => Promise<boolean>;
};

const StorefrontModule = NativeModules.StorefrontModule as StorefrontNative;

export async function presentIosManageSubscriptionsSheet(): Promise<boolean> {
  const show = StorefrontModule.showManageSubscriptions;
  if (typeof show !== 'function') {
    return false;
  }
  try {
    await show();
    return true;
  } catch {
    return false;
  }
}

export const getStorefrontCountryCode = async (): Promise<string | null> => {
  try {
    const code = await StorefrontModule.getCountryCode();

    return code ?? null;
  } catch (e) {
    if (__DEV__) {
      console.warn('[getStorefrontCountryCode] Failed to get country code', e);
    }
    return null;
  }
};
