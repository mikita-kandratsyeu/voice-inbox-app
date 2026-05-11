import { FIREBASE_APP_CHECK_DEBUG_TOKEN } from '@env';
import { getApp } from '@react-native-firebase/app';
import { initializeAppCheck } from '@react-native-firebase/app-check';
// @ts-ignore
import ReactNativeFirebaseAppCheckProvider from '@react-native-firebase/app-check/dist/module/ReactNativeFirebaseAppCheckProvider';
import { getInitialNotification, getMessaging } from '@react-native-firebase/messaging';
import { useEffect } from 'react';

import { checkAndFlagLegacyPinHash } from '@/entities/app-lock';
import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import { syncPrivateCapabilityTier, useSettingsStore } from '@/entities/settings';
import { runAutoArchiveReadNotesIfEligible } from '@/features/auto-archive/model/runAutoArchiveReadNotesIfEligible';
import { initRevenueCatWhenReady } from '@/features/entitlements';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import { initRuntimeConfig } from '@/shared/config/runtimeConfig';
import { initDB, isString } from '@/shared/lib';
import { syncAnalyticsUserId } from '@/shared/lib/analytics';
import { syncCrashlyticsUserId } from '@/shared/lib/crashlytics';
import { getOrCreateDeviceId } from '@/shared/lib/device-id';
import { prefetchModelManifest } from '@/shared/lib/model-manifest';
import { ensurePushRegistered, type PushNotificationData } from '@/shared/lib/push';

type OnInitialPushData = (data: PushNotificationData) => void;

export type BootstrapCriticalError = 'db_init_failed';

type UseAppBootstrapOptions = {
  onBootstrapReady?: () => void;
  onCriticalError?: (kind: BootstrapCriticalError) => void;
};

export function useAppBootstrap(
  onInitialPushData: OnInitialPushData,
  options?: UseAppBootstrapOptions,
): void {
  const { onBootstrapReady, onCriticalError } = options ?? {};

  useEffect(() => {
    let cancelled = false;
    let deferredInitTimer: ReturnType<typeof setTimeout> | null = null;

    const notifyReady = () => {
      if (!cancelled) {
        onBootstrapReady?.();
      }
    };

    const appCheckDebugToken =
      isString(FIREBASE_APP_CHECK_DEBUG_TOKEN) && FIREBASE_APP_CHECK_DEBUG_TOKEN.length > 0
        ? FIREBASE_APP_CHECK_DEBUG_TOKEN
        : undefined;

    const rnfbProvider = new ReactNativeFirebaseAppCheckProvider();
    rnfbProvider.configure({
      android: {
        provider: __DEV__ ? 'debug' : 'playIntegrity',
        ...(appCheckDebugToken != null ? { debugToken: appCheckDebugToken } : {}),
      },
      apple: {
        provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
        ...(appCheckDebugToken != null ? { debugToken: appCheckDebugToken } : {}),
      },
    });

    void initializeAppCheck(getApp(), {
      provider: rnfbProvider,
      isTokenAutoRefreshEnabled: true,
    }).catch((err) => {
      if (__DEV__) {
        console.warn('[bootstrap] App Check init failed', err);
      }
    });

    initRuntimeConfig()
      .catch(() => {
        if (__DEV__) console.warn('[bootstrap] failed to initialize remote config');
      })
      .then(() => {
        prefetchModelManifest();
        return initDB();
      })
      .then(async () => {
        useSettingsStore.getState().reconcileAiExecutionModeAfterRemoteConfig();
        syncPrivateCapabilityTier();
        await Promise.all([useRecordStore.getState().load(), useFolderStore.getState().load()]);

        try {
          const purged = await useRecordStore.getState().purgeExpiredTrashRecords();
          if (!cancelled && purged > 0) {
            await useRecordStore.getState().load();
          }
        } catch {
          if (__DEV__) console.warn('[bootstrap] trash purge failed');
        }

        try {
          const archived = await runAutoArchiveReadNotesIfEligible(undefined, {
            skipCooldown: true,
          });

          if (!cancelled && archived > 0) {
            await useRecordStore.getState().load();
          }
        } catch {
          if (__DEV__) console.warn('[bootstrap] auto-archive failed');
        }

        notifyReady();

        void (async () => {
          try {
            const deviceId = await getOrCreateDeviceId();
            await Promise.all([syncCrashlyticsUserId(deviceId), syncAnalyticsUserId(deviceId)]);
            void initRevenueCatWhenReady(deviceId);
          } catch {
            if (__DEV__) console.warn('[bootstrap] failed to sync analytics/crashlytics user id');
          }
        })();

        void checkAndFlagLegacyPinHash();

        deferredInitTimer = setTimeout(() => {
          void (async () => {
            try {
              const initial = await getInitialNotification(getMessaging());
              if (!cancelled && initial?.data) {
                onInitialPushData(initial.data as unknown as PushNotificationData);
              }
            } catch {
              if (__DEV__) console.warn('[bootstrap] failed to read initial push notification');
            }

            if (getHasSeenOnboarding()) {
              ensurePushRegistered().catch(() => {});
            }
          })();
        }, 0);
      })
      .catch((err) => {
        if (__DEV__) {
          console.warn('[bootstrap] critical failure', err);
        }

        notifyReady();

        if (!cancelled) {
          onCriticalError?.('db_init_failed');
        }
      });

    return () => {
      cancelled = true;
      if (deferredInitTimer) {
        clearTimeout(deferredInitTimer);
      }
    };
  }, [onBootstrapReady, onCriticalError, onInitialPushData]);
}
