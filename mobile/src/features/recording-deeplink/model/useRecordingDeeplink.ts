import { useCallback } from 'react';

import { diagWarn } from '@/shared/lib/appLogger';

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
        diagWarn('[useRecordingDeeplink] failed to handle deeplink', e);
      }
    },
    [requestPauseResumeToggle],
  );

  return { handleRecordingDeeplink };
};
