import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { useFolderStore } from '@/entities/folder';
import { FOLDER_ICON_KEYS, type FolderIconKey } from '@/entities/folder/lib/folderLucideIcons';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useProEntitlement } from '@/features/pro-license';
import { DEFAULT_FOLDER_BRAND_HEX, isString, useNetworkStatus } from '@/shared/lib';
import { pollAutoOrganizeFolders, postAutoOrganizeFolders } from '@/shared/lib/ai-api';
import {
  getAiWeeklyLimitExceededMessage,
  getAutoOrganizeWeeklyLimitExceededMessage,
} from '@/shared/lib/ai-api/limitUserMessage';

const MIN_NOTES_TO_AUTO_ORGANIZE = 5;
const MAX_NOTES_FOR_SINGLE_REQUEST = 60;
const ALLOWED_ICONS = new Set<string>(FOLDER_ICON_KEYS);

const MAX_TRANSCRIPT_CHARS_FOR_AUTO_ORGANIZE = 2500;
const MAX_SUMMARY_CHARS_FOR_AUTO_ORGANIZE = 600;
const MAX_TASKS_FOR_AUTO_ORGANIZE = 12;
const MAX_TASK_TEXT_CHARS_FOR_AUTO_ORGANIZE = 200;
const MAX_TAGS_FOR_AUTO_ORGANIZE = 8;

function truncateText(s: string | undefined, maxChars: number): string | undefined {
  if (!isString(s)) return undefined;

  const trimmed = s.trim();

  if (!trimmed) return undefined;
  if (trimmed.length <= maxChars) return trimmed;

  return `${trimmed.slice(0, maxChars)}...`;
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

function sanitizeFolderIcon(icon: string): FolderIconKey {
  return ALLOWED_ICONS.has(icon) ? (icon as FolderIconKey) : 'briefcase';
}

export function useAutoOrganizeFolders(records: VoiceRecord[]) {
  const { t, i18n } = useTranslation();
  const { isProActive } = useProEntitlement();
  const { isConnected } = useNetworkStatus();
  const { folders, createFolder } = useFolderStore();
  const setRecordFolder = useRecordStore((s) => s.setRecordFolder);
  const [isRunning, setIsRunning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
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
        .map((r) => ({
          id: r.id,
          title: r.title.trim(),
          transcript:
            r.summary && r.summary.trim()
              ? undefined
              : truncateText(r.transcript, MAX_TRANSCRIPT_CHARS_FOR_AUTO_ORGANIZE),
          summary: truncateText(r.summary, MAX_SUMMARY_CHARS_FOR_AUTO_ORGANIZE),
          tags: Array.isArray(r.tags) ? r.tags.slice(0, MAX_TAGS_FOR_AUTO_ORGANIZE) : undefined,
          classification: r.classification,
          tasks: r.tasks
            ? r.tasks
                .slice(0, MAX_TASKS_FOR_AUTO_ORGANIZE)
                .map((task) => ({
                  text: truncateText(task.text, MAX_TASK_TEXT_CHARS_FOR_AUTO_ORGANIZE) ?? '',
                }))
                .filter((t) => Boolean(t.text))
            : undefined,
        })),
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

      const folderByName = new Map(folders.map((f) => [f.name.trim().toLowerCase(), f.id]));
      for (const generatedFolder of pollResult.result.folders) {
        const key = generatedFolder.name.trim().toLowerCase();
        if (!key || folderByName.has(key)) continue;
        const created = await createFolder(
          generatedFolder.name.trim(),
          isProActive
            ? generatedFolder.color || DEFAULT_FOLDER_BRAND_HEX
            : DEFAULT_FOLDER_BRAND_HEX,
          sanitizeFolderIcon(generatedFolder.icon),
        );
        folderByName.set(key, created.id);
      }

      for (const assignment of pollResult.result.assignments) {
        const folderId = folderByName.get(assignment.folderName.trim().toLowerCase());
        if (!folderId) continue;
        await setRecordFolder(assignment.recordId, folderId);
      }

      setShowSuccess(true);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => {
        setShowSuccess(false);
      }, 2400);
    } catch {
      Alert.alert(t('common.error'), t('folders.autoOrganizeFailedDescription'));
    } finally {
      setIsRunning(false);
    }
  }, [
    createFolder,
    eligibleNotes,
    folders,
    isProActive,
    isConnected,
    isRunning,
    i18n.language,
    setRecordFolder,
    t,
  ]);

  const overlayMode: 'loading' | 'success' = isRunning ? 'loading' : 'success';

  return {
    runAutoOrganize,
    isRunning,
    overlayVisible: isRunning || showSuccess,
    overlayMode,
    eligibleCount: eligibleNotes.length,
    minRequired: MIN_NOTES_TO_AUTO_ORGANIZE,
  };
}
