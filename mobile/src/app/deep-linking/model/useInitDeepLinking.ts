import { useCallback, useEffect } from 'react';
import { Linking } from 'react-native';

import { navigationRef } from '@/app/navigation/navigationRef';
import { useDownloadingDeeplink } from '@/features/downloading-deeplink';
import { tryParseInAppEventDeepLink } from '@/features/in-app-event';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import { useRecordingDeeplink } from '@/features/recording-deeplink/model/useRecordingDeeplink';

const START_RECORDING_URL = 'voiceinbox://record/start';
const TEXT_NOTE_URL = 'voiceinbox://note/text';
const ALL_TASKS_URL = 'voiceinbox://tasks';

const pendingRecordModalOpenRef = { current: false };
const pendingTextNoteModalOpenRef = { current: false };
const pendingAllTasksOpenRef = { current: false };
const pendingInAppEventIdRef = { current: null as string | null };

export const flushPendingRecordModalNavigation = () => {
  if (!navigationRef.isReady()) {
    return;
  }

  if (pendingRecordModalOpenRef.current) {
    pendingRecordModalOpenRef.current = false;
    navigationRef.navigate('RecordModal');
  }

  if (pendingTextNoteModalOpenRef.current) {
    pendingTextNoteModalOpenRef.current = false;
    navigationRef.navigate('TextNoteModal');
  }

  if (pendingAllTasksOpenRef.current) {
    pendingAllTasksOpenRef.current = false;
    navigationRef.navigate('AllTasks');
  }

  if (pendingInAppEventIdRef.current) {
    const eventId = pendingInAppEventIdRef.current;
    pendingInAppEventIdRef.current = null;
    navigationRef.navigate('InAppEventDetail', { eventId });
  }
};

export const useInitDeepLinking = () => {
  const { handleRecordingDeeplink } = useRecordingDeeplink();
  const { handleDownloadingDeeplink } = useDownloadingDeeplink();

  const handleStartRecording = useCallback((rawUrl: string) => {
    const normalized = rawUrl.replace(/\/+$/, '');
    if (normalized !== START_RECORDING_URL) return false;

    if (!getHasSeenOnboarding()) {
      return true;
    }

    if (navigationRef.isReady()) {
      navigationRef.navigate('RecordModal');
    } else {
      pendingRecordModalOpenRef.current = true;
    }
    return true;
  }, []);

  const handleTextNoteDeepLink = useCallback((rawUrl: string) => {
    const normalized = rawUrl.replace(/\/+$/, '');
    if (normalized !== TEXT_NOTE_URL) return false;

    if (!getHasSeenOnboarding()) {
      return true;
    }

    if (navigationRef.isReady()) {
      navigationRef.navigate('TextNoteModal');
    } else {
      pendingTextNoteModalOpenRef.current = true;
    }
    return true;
  }, []);

  const handleAllTasksDeepLink = useCallback((rawUrl: string) => {
    const normalized = rawUrl.replace(/\/+$/, '');
    if (normalized !== ALL_TASKS_URL) return false;

    if (!getHasSeenOnboarding()) {
      return true;
    }

    if (navigationRef.isReady()) {
      navigationRef.navigate('AllTasks');
    } else {
      pendingAllTasksOpenRef.current = true;
    }
    return true;
  }, []);

  const handleInAppEventDeepLink = useCallback((rawUrl: string) => {
    const eventId = tryParseInAppEventDeepLink(rawUrl);
    if (!eventId) return false;

    if (!getHasSeenOnboarding()) {
      return true;
    }

    if (navigationRef.isReady()) {
      navigationRef.navigate('InAppEventDetail', { eventId });
    } else {
      pendingInAppEventIdRef.current = eventId;
    }
    return true;
  }, []);

  const routeDeepLink = useCallback(
    (rawUrl: string) => {
      try {
        if (handleStartRecording(rawUrl)) return;
        if (handleTextNoteDeepLink(rawUrl)) return;
        if (handleAllTasksDeepLink(rawUrl)) return;
        if (handleInAppEventDeepLink(rawUrl)) return;

        const url = new URL(rawUrl);

        handleRecordingDeeplink(url);
        handleDownloadingDeeplink(url);
      } catch (e) {
        if (__DEV__) console.warn('[deeplink] invalid url', rawUrl, e);
      }
    },
    [
      handleAllTasksDeepLink,
      handleDownloadingDeeplink,
      handleInAppEventDeepLink,
      handleRecordingDeeplink,
      handleStartRecording,
      handleTextNoteDeepLink,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    void Linking.getInitialURL().then((url) => {
      if (cancelled || !url) {
        return;
      }

      routeDeepLink(url);
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      if (cancelled) {
        return;
      }

      routeDeepLink(url);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [routeDeepLink]);
};
