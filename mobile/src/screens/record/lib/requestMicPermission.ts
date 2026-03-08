import { PermissionsAndroid, Platform } from 'react-native';

export const requestMicPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Разрешение на запись',
          message: 'Приложению нужен доступ к микрофону для записи голоса.',
          buttonPositive: 'Разрешить',
          buttonNegative: 'Отмена',
        },
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  return true;
};
