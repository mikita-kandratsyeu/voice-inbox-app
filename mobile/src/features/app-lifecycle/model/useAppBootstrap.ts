import { getInitialNotification, getMessaging } from '@react-native-firebase/messaging';
import { useEffect } from 'react';
import BootSplash from 'react-native-bootsplash';

import { useRecordStore } from '@/entities/record';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import { initDB } from '@/shared/lib';
import { ensurePushRegistered, type PushNotificationData } from '@/shared/lib/push';

type OnInitialPushData = (data: PushNotificationData) => void;

export function useAppBootstrap(onInitialPushData: OnInitialPushData): void {
  useEffect(() => {
    initDB()
      .then(async () => {
        await useRecordStore.getState().load();
        BootSplash.hide({ fade: true });

        const initial = await getInitialNotification(getMessaging());
        if (initial?.data) {
          onInitialPushData(initial.data as unknown as PushNotificationData);
        }

        if (getHasSeenOnboarding()) {
          ensurePushRegistered().catch(() => {});
        }
      })
      .catch(() => {
        BootSplash.hide({ fade: true });
      });
  }, [onInitialPushData]);
}
