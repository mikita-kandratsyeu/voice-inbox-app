import { useRecordStore } from '@/entities/record';
import { resumeCloudSummarizeForRecord } from '@/features/ai-processing';
import { createHandlePushNotification } from '@/features/push-handling';
import { recordIdFromSummarizeJobId } from '@/shared/lib/ai-api';

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

    const resolvedRecordId = recordIdFromSummarizeJobId(recordId) ?? recordId.split('-')[0];
    const record = useRecordStore.getState().records.find((r) => r.id === resolvedRecordId);

    if (record) {
      navigationRef.navigate('RecordingDetail', { record });
      resumeCloudSummarizeForRecord(record.id);
    } else {
      navigationRef.navigate('Main');
    }
  },
});
