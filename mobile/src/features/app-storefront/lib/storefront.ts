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

const EU_ALPHA3 = [
  'AUT',
  'BEL',
  'BGR',
  'HRV',
  'CYP',
  'CZE',
  'DNK',
  'EST',
  'FIN',
  'FRA',
  'DEU',
  'GRC',
  'HUN',
  'IRL',
  'ITA',
  'LVA',
  'LTU',
  'LUX',
  'MLT',
  'NLD',
  'POL',
  'PRT',
  'ROU',
  'SVK',
  'SVN',
  'ESP',
  'SWE',
];

export async function isEUUserByStorefront(): Promise<boolean> {
  const code = await getStorefrontCountryCode();

  if (!code) {
    return false;
  }

  return EU_ALPHA3.includes(code);
}
