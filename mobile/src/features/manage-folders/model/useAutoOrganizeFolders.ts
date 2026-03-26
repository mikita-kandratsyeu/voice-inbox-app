import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import { useFolderStore } from '@/entities/folder';
import { isString, useNetworkStatus } from '@/shared/lib';
import { pollAutoOrganizeFolders, postAutoOrganizeFolders } from '@/shared/lib/ai-api';
import {
  getAiWeeklyLimitExceededMessage,
  getAutoOrganizeWeeklyLimitExceededMessage,
} from '@/shared/lib/ai-api/limitUserMessage';

type AutoOrganizeResult = {
  folders: Array<{ name: string; icon: string; color: string }>;
  assignments: Array<{ recordId: string; folderName: string }>;
};

type UseAutoOrganizeFoldersOptions = {
  onResult?: (result: AutoOrganizeResult) => void | Promise<void>;
};

const MIN_NOTES_TO_AUTO_ORGANIZE = 5;
const MAX_NOTES_FOR_SINGLE_REQUEST = 60;
/** Keep in sync with `web/lib/auto-organize-input-limits.ts`. */
const MAX_TRANSCRIPT_CHARS_FOR_AUTO_ORGANIZE = 900;
const MAX_TRANSCRIPT_HINT_CHARS_FOR_AUTO_ORGANIZE = 280;
const MAX_SUMMARY_CHARS_FOR_AUTO_ORGANIZE = 360;
const MAX_TITLE_CHARS_FOR_AUTO_ORGANIZE = 100;

const TRANSCRIPT_EXCERPT_GAP = '\n…\n';

function truncateText(s: string | undefined, maxChars: number): string | undefined {
  if (!isString(s)) return undefined;

  const trimmed = s.trim();

  if (!trimmed) return undefined;
  if (trimmed.length <= maxChars) return trimmed;

  return `${trimmed.slice(0, maxChars)}...`;
}

function smartTranscriptExcerpt(s: string | undefined, maxChars: number): string | undefined {
  if (!isString(s)) return undefined;
  const t = s.trim();
  if (!t) return undefined;
  if (t.length <= maxChars) return t;
  if (maxChars <= TRANSCRIPT_EXCERPT_GAP.length + 2) return t.slice(0, maxChars);
  const budget = maxChars - TRANSCRIPT_EXCERPT_GAP.length;
  const headLen = Math.ceil(budget / 2);
  const tailLen = Math.floor(budget / 2);
  return `${t.slice(0, headLen)}${TRANSCRIPT_EXCERPT_GAP}${t.slice(-tailLen)}`;
}

function isLikelyNetworkError(raw: string): boolean {
  const lower = raw.toLowerCase();

  return (
    lower.includes('nsurlerror') ||
    lower.includes('kcferrordomaincfnetwork') ||
    lower.includes('failed to connect') ||
    lower.includes('econnrefused') ||
    lower.includes('ehostunreachable') ||
    lower.includes('/api/token') ||
    lower.includes('ne udalos podkluchitsya') ||
    lower.includes('не удалось подключиться') ||
    lower.includes('network error')
  );
}

export function useAutoOrganizeFolders(records: VoiceRecord[], options?: UseAutoOrganizeFoldersOptions) {
  const { t, i18n } = useTranslation();
  const { isConnected } = useNetworkStatus();
  const folders = useFolderStore((s) => s.folders);
  const [isRunning, setIsRunning] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const eligibleNotes = useMemo(
    () =>
      records
        .filter((r) => r.status !== 'archived')
        .slice(0, MAX_NOTES_FOR_SINGLE_REQUEST)
        .map((r) => {
          const titleTrimmed = r.title.trim();
          const hasSummary = Boolean(r.summary?.trim());
          return {
            id: r.id,
            ...(titleTrimmed
              ? { title: titleTrimmed.slice(0, MAX_TITLE_CHARS_FOR_AUTO_ORGANIZE) }
              : {}),
            transcript: smartTranscriptExcerpt(
              r.transcript,
              hasSummary
                ? MAX_TRANSCRIPT_HINT_CHARS_FOR_AUTO_ORGANIZE
                : MAX_TRANSCRIPT_CHARS_FOR_AUTO_ORGANIZE,
            ),
            summary: truncateText(r.summary, MAX_SUMMARY_CHARS_FOR_AUTO_ORGANIZE),
            classification: r.classification,
          };
        }),
    [records],
  );

  const runAutoOrganize = useCallback(async () => {
    if (isRunning) {
      return;
    }

    if (eligibleNotes.length < MIN_NOTES_TO_AUTO_ORGANIZE) {
      Alert.alert(
        t('folders.autoOrganizeMinTitle'),
        t('folders.autoOrganizeMinDescription', {
          min: MIN_NOTES_TO_AUTO_ORGANIZE,
          count: eligibleNotes.length,
        }),
      );

      return;
    }

    if (isConnected === false) {
      Alert.alert(t('common.error'), t('folders.autoOrganizeFailedDescription'));
      return;
    }

    setIsRunning(true);
    try {
      const requestId = `auto-organize-${Date.now()}`;
      const postResult = await postAutoOrganizeFolders({
        id: requestId,
        appLanguage: i18n.language,
        existingFolders: folders.map((f) => ({
          name: f.name,
          icon: f.icon,
          color: f.color,
        })),
        notes: eligibleNotes,
      });
      if (!postResult.ok) {
        const msg =
          'limitExceeded' in postResult && postResult.limitExceeded
            ? postResult.reason === 'auto_organize_free_limit'
              ? getAutoOrganizeWeeklyLimitExceededMessage()
              : getAiWeeklyLimitExceededMessage()
            : postResult.error;
        const safeMsg =
          typeof msg === 'string' && isLikelyNetworkError(msg)
            ? t('folders.autoOrganizeFailedDescription')
            : msg;
        Alert.alert(t('common.error'), safeMsg);
        return;
      }

      const pollResult = await pollAutoOrganizeFolders(requestId, postResult.data.syncToken);
      if (!pollResult.ok) {
        Alert.alert(t('common.error'), t('folders.autoOrganizeFailedDescription'));
        return;
      }

      await options?.onResult?.(pollResult.result);
    } catch {
      Alert.alert(t('common.error'), t('folders.autoOrganizeFailedDescription'));
    } finally {
      setIsRunning(false);
    }
  }, [
    eligibleNotes,
    folders,
    isConnected,
    isRunning,
    i18n.language,
    t,
    options,
  ]);

  const overlayMode: 'loading' | 'success' = isRunning ? 'loading' : 'success';

  return {
    runAutoOrganize,
    isRunning,
    overlayVisible: isRunning,
    overlayMode,
    eligibleCount: eligibleNotes.length,
    minRequired: MIN_NOTES_TO_AUTO_ORGANIZE,
  };
}
