import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { isCrashlyticsDebugEnabled } from '@/shared/config/buildEnv';
import { devWarn } from '@/shared/lib/appLogger';
import { clearMmkvStorage, getMmkvKeyCount } from '@/shared/lib/async-storage/mmkv';
import {
  refreshMobileBannerManifest,
  resetMobileBannerLocalCache,
} from '@/shared/lib/mobile-banner';

import { performHardReset } from '../../settings/lib/hardReset';

export function useDebugScreen() {
  const { t } = useTranslation();
  const [isHardResetting, setIsHardResetting] = useState(false);
  const [isClearingMmkv, setIsClearingMmkv] = useState(false);
  const [isResettingMobileBanner, setIsResettingMobileBanner] = useState(false);

  const handleClearMmkv = useCallback(() => {
    const keyCount = getMmkvKeyCount();
    Alert.alert(
      t('settings.debugScreen.clearMmkvAlertTitle'),
      t('settings.debugScreen.clearMmkvAlertMessage', { count: keyCount }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.debugScreen.clearMmkv'),
          style: 'destructive',
          onPress: () => {
            try {
              setIsClearingMmkv(true);
              clearMmkvStorage();
              Alert.alert(t('common.done'), t('settings.debugScreen.clearMmkvSuccess'));
            } catch (err) {
              devWarn('[debug] clear mmkv failed', err);
              Alert.alert(t('common.error'), t('settings.debugScreen.clearMmkvFailed'));
            } finally {
              setIsClearingMmkv(false);
            }
          },
        },
      ],
    );
  }, [t]);

  const handleResetMobileBanner = useCallback(() => {
    Alert.alert(
      t('settings.debugScreen.resetMobileBannerAlertTitle'),
      t('settings.debugScreen.resetMobileBannerAlertMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.debugScreen.resetMobileBanner'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setIsResettingMobileBanner(true);
                resetMobileBannerLocalCache();
                await refreshMobileBannerManifest();
                Alert.alert(t('common.done'), t('settings.debugScreen.resetMobileBannerSuccess'));
              } catch (err) {
                devWarn('[debug] reset mobile banner cache failed', err);
                Alert.alert(t('common.error'), t('settings.debugScreen.resetMobileBannerFailed'));
              } finally {
                setIsResettingMobileBanner(false);
              }
            })();
          },
        },
      ],
    );
  }, [t]);

  const handleHardReset = useCallback(() => {
    Alert.alert(
      'Hard reset',
      'This will delete ALL local app data including recordings, settings, database, and keychain secrets. Continue?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Hard reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsHardResetting(true);
              await performHardReset();
              Alert.alert(t('common.done'), 'Hard reset complete. Please fully restart the app.');
            } catch (err) {
              devWarn('[debug] hard reset failed', err);

              Alert.alert(t('common.error'), 'Hard reset failed');
            } finally {
              setIsHardResetting(false);
            }
          },
        },
      ],
    );
  }, [t]);

  const showCrashlyticsButton = __DEV__ && isCrashlyticsDebugEnabled();

  return {
    handleClearMmkv,
    handleResetMobileBanner,
    handleHardReset,
    isClearingMmkv,
    isResettingMobileBanner,
    isHardResetting,
    showCrashlyticsButton,
  };
}
