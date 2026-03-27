import { useCallback } from 'react';

import { useRecordingDeeplinkStore } from './store';

export const useRecordingDeeplink = () => {
  const requestPauseResumeToggle = useRecordingDeeplinkStore((s) => s.requestPauseResumeToggle);

  const handleRecordingDeeplink = useCallback(
    async (url: URL) => {
      const href = url.toString().replace(/\/+$/, '');
      if (href !== 'voiceinbox://stop-recording') {
        return;
      }

      try {
        requestPauseResumeToggle();
      } catch (e) {
        if (__DEV__) {
          console.warn('[useRecordingDeeplink] failed to handle deeplink', e);
        }
      }
    },
    [requestPauseResumeToggle],
  );

  return { handleRecordingDeeplink };
};
