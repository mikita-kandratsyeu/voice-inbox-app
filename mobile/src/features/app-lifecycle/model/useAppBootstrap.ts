import { getInitialNotification, getMessaging } from '@react-native-firebase/messaging';
import { useEffect } from 'react';

import { useRecordStore } from '@/entities/record';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import { initDB } from '@/shared/lib';
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
    initDB()
      .then(async () => {
        await useRecordStore.getState().load();
        onBootstrapReady?.();

        const initial = await getInitialNotification(getMessaging());
        if (initial?.data) {
          onInitialPushData(initial.data as unknown as PushNotificationData);
        }

        if (getHasSeenOnboarding()) {
          ensurePushRegistered().catch(() => {});
        }
      })
      .catch(() => {
        onBootstrapReady?.();
      });
  }, [onBootstrapReady, onInitialPushData]);
}
