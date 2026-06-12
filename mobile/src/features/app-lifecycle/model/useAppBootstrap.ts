import { getInitialNotification, getMessaging } from '@react-native-firebase/messaging';
import { useEffect } from 'react';

import { checkAndFlagLegacyPinHash } from '@/entities/app-lock';
import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import { syncPrivateCapabilityTier } from '@/entities/settings';
import { runAutoArchiveReadNotesIfEligible } from '@/features/auto-archive/model/runAutoArchiveReadNotesIfEligible';
import { syncAllBackupReminderNotifications } from '@/features/backup-reminder-notifications';
import { initRevenueCatWhenReady } from '@/features/entitlements';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import { syncAllTaskDeadlineNotifications } from '@/features/task-deadline-notifications';
import { cleanupOrphanTranscriptionTempWavs } from '@/features/transcription/lib/transcriptionTempAudioCleanup';
import { initRuntimeConfig } from '@/shared/config/runtimeConfig';
import { getWebApiEnvironmentStatus, getWebApiHost } from '@/shared/config/webApiEnvironment';
import { initDB } from '@/shared/lib';
import { syncAnalyticsUserId } from '@/shared/lib/analytics';
import { initFirebaseAppCheck } from '@/shared/lib/app-check/appCheckToken';
import { diagInfo, diagWarn } from '@/shared/lib/appLogger';
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

    void initFirebaseAppCheck().catch((err) => {
      diagWarn('[bootstrap] App Check init failed', err);
    });

    const dbInit = initDB();

    initRuntimeConfig()
      .catch(() => {
        diagWarn('[bootstrap] failed to initialize remote config');
      })
      .then(() => {
        diagInfo('[bootstrap] web API', {
          environment: getWebApiEnvironmentStatus(),
          host: getWebApiHost(),
        });
        prefetchModelManifest();
        return dbInit;
      })
      .then(async () => {
        syncPrivateCapabilityTier();
        await Promise.all([useRecordStore.getState().load(), useFolderStore.getState().load()]);

        try {
          const purged = await useRecordStore.getState().purgeExpiredTrashRecords();
          if (!cancelled && purged > 0) {
            await useRecordStore.getState().load();
          }
        } catch {
          diagWarn('[bootstrap] trash purge failed');
        }

        try {
          const archived = await runAutoArchiveReadNotesIfEligible(undefined, {
            skipCooldown: true,
          });

          if (!cancelled && archived > 0) {
            await useRecordStore.getState().load();
          }
        } catch {
          diagWarn('[bootstrap] auto-archive failed');
        }

        try {
          await syncAllTaskDeadlineNotifications();
        } catch {
          diagWarn('[bootstrap] task deadline notification sync failed');
        }

        try {
          await syncAllBackupReminderNotifications();
        } catch {
          diagWarn('[bootstrap] backup reminder notification sync failed');
        }

        void cleanupOrphanTranscriptionTempWavs(useRecordStore.getState().records);

        notifyReady();

        void (async () => {
          try {
            const deviceId = await getOrCreateDeviceId();
            await Promise.all([syncCrashlyticsUserId(deviceId), syncAnalyticsUserId(deviceId)]);
            void initRevenueCatWhenReady(deviceId);
          } catch {
            diagWarn('[bootstrap] failed to sync analytics/crashlytics user id');
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
              diagWarn('[bootstrap] failed to read initial push notification');
            }

            if (getHasSeenOnboarding()) {
              ensurePushRegistered().catch(() => {});
            }
          })();
        }, 0);
      })
      .catch((err) => {
        diagWarn('[bootstrap] critical failure', err);

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
