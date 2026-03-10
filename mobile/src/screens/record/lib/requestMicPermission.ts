import { PermissionsAndroid, Platform } from 'react-native';

import { i18n } from '@/shared/lib';

export const requestMicPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: i18n.t('permissions.micTitle'),
          message: i18n.t('permissions.micMessage'),
          buttonPositive: i18n.t('permissions.allow'),
          buttonNegative: i18n.t('common.cancel'),
        },
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  return true;
};
