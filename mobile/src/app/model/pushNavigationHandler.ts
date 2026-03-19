import { useRecordStore } from '@/entities/record';
import { createHandlePushNotification } from '@/features/push-handling';

import { navigationRef } from '../navigation/navigationRef';

export const handlePushNotification = createHandlePushNotification({
  navigateToMain: () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Main');
    }
  },
  navigateToRecord: (recordId: string) => {
    if (!navigationRef.isReady()) {
      return;
    }

    const record = useRecordStore.getState().records.find((r) => r.id === recordId.split('-')[0]);

    if (record) {
      navigationRef.navigate('RecordingDetail', { record });
    } else {
      navigationRef.navigate('Main');
    }
  },
});
