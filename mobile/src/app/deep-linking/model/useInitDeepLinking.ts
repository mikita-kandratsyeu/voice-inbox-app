import { useCallback, useEffect } from 'react';
import { Linking } from 'react-native';

import { runNavigationWhenUnlocked } from '@/app/navigation/deferredNavigation';
import { navigationRef } from '@/app/navigation/navigationRef';
import { useDownloadingDeeplink } from '@/features/downloading-deeplink';
import { isAudioImportDeepLinkUrl } from '@/features/import-audio-file/lib/isAudioDeepLink';
import { dispatchSharedAudioImport } from '@/features/import-audio-file/lib/sharedAudioImportRegistry';
import { tryParseInAppEventDeepLink } from '@/features/in-app-event';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import { useRecordingDeeplink } from '@/features/recording-deeplink/model/useRecordingDeeplink';
import { IS_ANDROID } from '@/shared/lib';
import { diagWarn } from '@/shared/lib/appLogger';

const START_RECORDING_URL = 'voiceinbox://record/start';
const TEXT_NOTE_URL = 'voiceinbox://note/text';
const ALL_TASKS_URL = 'voiceinbox://tasks';

/**
 * Parses `voiceinbox://tasks` without `URL` host checks — Hermes can mis-parse
 * custom schemes with a host-only authority (empty hostname, pathname `/`).
 */
const tryParseAllTasksDeepLink = (rawUrl: string): { recordId?: string } | null => {
  const trimmed = rawUrl.trim();
  const [pathPart, queryPart] = trimmed.split('?', 2);
  const path = pathPart.replace(/\/+$/, '');

  if (path !== ALL_TASKS_URL && path !== 'voiceinbox:/tasks') {
    return null;
  }

  const recordId = queryPart
    ? new URLSearchParams(queryPart.split('#')[0]).get('recordId')?.trim() || undefined
    : undefined;

  return { recordId };
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

    runNavigationWhenUnlocked(() => {
      navigationRef.navigate('RecordModal');
    });
    return true;
  }, []);

  const handleTextNoteDeepLink = useCallback((rawUrl: string) => {
    const normalized = rawUrl.replace(/\/+$/, '');
    if (normalized !== TEXT_NOTE_URL) return false;

    if (!getHasSeenOnboarding()) {
      return true;
    }

    runNavigationWhenUnlocked(() => {
      navigationRef.navigate('TextNoteModal');
    });
    return true;
  }, []);

  const handleAllTasksDeepLink = useCallback((rawUrl: string) => {
    const parsed = tryParseAllTasksDeepLink(rawUrl);
    if (!parsed) {
      return false;
    }
    const { recordId } = parsed;

    if (!getHasSeenOnboarding()) {
      return true;
    }

    runNavigationWhenUnlocked(() => {
      navigationRef.navigate('AllTasks', recordId ? { recordId } : undefined);
    });
    return true;
  }, []);

  const handleInAppEventDeepLink = useCallback((rawUrl: string) => {
    const eventId = tryParseInAppEventDeepLink(rawUrl);
    if (!eventId) return false;

    if (!getHasSeenOnboarding()) {
      return true;
    }

    runNavigationWhenUnlocked(() => {
      navigationRef.navigate('InAppEventDetail', { eventId });
    });
    return true;
  }, []);

  const routeDeepLink = useCallback(
    (rawUrl: string) => {
      try {
        if (isAudioImportDeepLinkUrl(rawUrl)) {
          if (!getHasSeenOnboarding()) {
            return;
          }
          // Android content:// is copied in MainActivity; JS picks it up via SharedAudioImport.
          if (IS_ANDROID && rawUrl.trim().toLowerCase().startsWith('content:')) {
            return;
          }
          dispatchSharedAudioImport(rawUrl);
          return;
        }

        if (handleStartRecording(rawUrl)) return;
        if (handleTextNoteDeepLink(rawUrl)) return;
        if (handleAllTasksDeepLink(rawUrl)) return;
        if (handleInAppEventDeepLink(rawUrl)) return;

        const url = new URL(rawUrl);

        handleRecordingDeeplink(url);
        handleDownloadingDeeplink(url);
      } catch (e) {
        diagWarn('[deeplink] invalid url', { url: rawUrl }, e);
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
