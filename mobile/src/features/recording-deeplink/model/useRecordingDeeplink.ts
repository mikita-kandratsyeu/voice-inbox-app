import { useCallback } from 'react';

import { endRecordingLiveActivity } from '@/features/live-activity-recording';
import { useRecording } from '@/screens/record/model/useRecording';

export const useRecordingDeeplink = () => {
  const { stopRecording } = useRecording();

  const handleRecordingDeeplink = useCallback(
    async (url: URL) => {
      const href = url.toString().replace(/\/+$/, '');
      if (href !== 'voiceinbox://stop-recording') {
        return;
      }

      try {
        await stopRecording();
        await endRecordingLiveActivity();
      } catch (e) {
        if (__DEV__) {
          console.warn('[useRecordingDeeplink] failed to handle deeplink', e);
        }
      }
    },
    [stopRecording],
  );

  return { handleRecordingDeeplink };
};
