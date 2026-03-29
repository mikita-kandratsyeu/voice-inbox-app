import { getInitialNotification, getMessaging } from '@react-native-firebase/messaging';
import { useEffect } from 'react';

import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import { syncPrivateCapabilityTier, useSettingsStore } from '@/entities/settings';
import { runAutoArchiveReadNotesIfEligible } from '@/features/auto-archive/model/runAutoArchiveReadNotesIfEligible';
import { initRevenueCatWhenReady } from '@/features/entitlements';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import { initRuntimeConfig } from '@/shared/config/runtimeConfig';
import { initDB } from '@/shared/lib';
import { syncAnalyticsUserId } from '@/shared/lib/analytics';
import { syncCrashlyticsUserId } from '@/shared/lib/crashlytics';
import { getOrCreateDeviceId } from '@/shared/lib/device-id';
import { ensurePushRegistered, type PushNotificationData } from '@/shared/lib/push';

type OnInitialPushData = (data: PushNotificationData) => void;

type UseAppBootstrapOptions = {
  onBootstrapReady?: () => void;
};

export function useAppBootstrap(
  onInitialPushData: OnInitialPushData,
  options?: UseAppBootstrapOptions,
): void {
  const { onBootstrapReady } = options ?? {};

  useEffect(() => {
    let cancelled = false;
    let deferredInitTimer: ReturnType<typeof setTimeout> | null = null;

    Promise.all([initRuntimeConfig(), initDB()])
      .then(async () => {
        useSettingsStore.getState().reconcileAiExecutionModeAfterRemoteConfig();
        syncPrivateCapabilityTier();
        await Promise.all([useRecordStore.getState().load(), useFolderStore.getState().load()]);

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

        if (!cancelled) {
          onBootstrapReady?.();
        }

        void (async () => {
          try {
            const deviceId = await getOrCreateDeviceId();
            await Promise.all([syncCrashlyticsUserId(deviceId), syncAnalyticsUserId(deviceId)]);
            void initRevenueCatWhenReady(deviceId);
          } catch {
            if (__DEV__) console.warn('[bootstrap] failed to sync analytics/crashlytics user id');
          }
        })();

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
      .catch(() => {
        if (!cancelled) {
          onBootstrapReady?.();
        }
      });
    return () => {
      cancelled = true;
      if (deferredInitTimer) {
        clearTimeout(deferredInitTimer);
      }
    };
  }, [onBootstrapReady, onInitialPushData]);
}
