import { runNavigationWhenUnlocked } from '@/app/navigation/deferredNavigation';
import { useRecordStore } from '@/entities/record';
import { resumeCloudSummarizeForRecord } from '@/features/ai-processing';
import { createHandlePushNotification } from '@/features/push-handling';
import { recordIdFromSummarizeJobId } from '@/shared/lib/ai-api';

import { navigationRef } from '../navigation/navigationRef';

export const handlePushNotification = createHandlePushNotification({
  navigateToMain: () => {
    runNavigationWhenUnlocked(() => {
      navigationRef.navigate('Main');
    });
  },
  navigateToRecord: (recordId: string) => {
    runNavigationWhenUnlocked(() => {
      const resolvedRecordId = recordIdFromSummarizeJobId(recordId) ?? recordId.split('-')[0];
      const record = useRecordStore.getState().records.find((r) => r.id === resolvedRecordId);

      if (record) {
        navigationRef.navigate('RecordingDetail', { record });
        resumeCloudSummarizeForRecord(record.id);
      } else {
        navigationRef.navigate('Main');
      }
    });
  },
});
