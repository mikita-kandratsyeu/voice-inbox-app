import { NativeModules } from 'react-native';

const { StorefrontModule } = NativeModules;

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
