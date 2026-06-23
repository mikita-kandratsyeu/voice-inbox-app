import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, type AppStateStatus } from 'react-native';

import {
  dismissMobileBanner,
  type MobileBanner,
  refreshMobileBannerManifest,
  resolveActiveMobileBanner,
} from '@/shared/lib/mobile-banner';

export function useMobileAdminBanner(): {
  banner: MobileBanner | null;
  dismiss: () => void;
  refresh: () => void;
} {
  const { i18n } = useTranslation();
  const [banner, setBanner] = useState<MobileBanner | null>(() =>
    resolveActiveMobileBanner(i18n.language),
  );

  const syncBanner = useCallback(() => {
    setBanner(resolveActiveMobileBanner(i18n.language));
  }, [i18n.language]);

  const refresh = useCallback(() => {
    void refreshMobileBannerManifest()
      .then(() => {
        syncBanner();
      })
      .catch(() => {
        syncBanner();
      });
  }, [syncBanner]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    syncBanner();
  }, [syncBanner]);

  useEffect(() => {
    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        refresh();
      }
    };

    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, [refresh]);

  const dismiss = useCallback(() => {
    if (!banner) {
      return;
    }

    dismissMobileBanner(banner.id);
    setBanner(null);
  }, [banner]);

  return { banner, dismiss, refresh };
}
