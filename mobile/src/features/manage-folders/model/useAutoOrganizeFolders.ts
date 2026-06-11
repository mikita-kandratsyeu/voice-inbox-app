import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { alertAiLimitExceeded } from '@/app/navigation/openPlanPaywall';
import { useFolderStore } from '@/entities/folder';
import type {
  AutoOrganizeMode,
  AutoOrganizeRunParams,
  AutoOrganizeRunResult,
} from '@/entities/folder/lib/autoOrganizeTypes';
import {
  isProAutoOrganizeMode,
  isProAutoOrganizeTemplate,
  normalizeAutoOrganizeTemplate,
} from '@/entities/folder/lib/autoOrganizeTypes';
import type { TaskItem, VoiceRecord } from '@/entities/record';
import {
  DEFAULT_LOCAL_AI_MODEL_ID,
  isPrivateCustomServerMode,
  resolveEffectivePrivateAiProvider,
  useSettingsStore,
} from '@/entities/settings';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import { isString, requestAiUsageRefresh, useNetworkStatus } from '@/shared/lib';
import { pollAutoOrganizeFolders, postAutoOrganizeFolders } from '@/shared/lib/ai-api';
import { AI_REQUEST_CANCELLED } from '@/shared/lib/ai-api/abort';
import {
  getAiWeeklyLimitExceededMessage,
  getAutoOrganizeWeeklyLimitExceededMessage,
} from '@/shared/lib/ai-api/limitUserMessage';
import { runPrivateRemoteAutoOrganizeFolders } from '@/shared/lib/ai-core/privateRemoteProvider';
import type { AiExecutionContext } from '@/shared/lib/ai-core/types';
import { ensureCloudAiThirdPartyConsent } from '@/shared/lib/cloud-ai-consent';

type UseAutoOrganizeFoldersOptions = {
  onResult?: (result: AutoOrganizeRunResult) => void | Promise<void>;
};

const MIN_NOTES_TO_AUTO_ORGANIZE = 5;
const MAX_NOTES_FOR_SINGLE_REQUEST = 60;
/** Keep in sync with `web/lib/auto-organize-input-limits.ts`. */
const MAX_TRANSCRIPT_CHARS_FOR_AUTO_ORGANIZE = 900;
const MAX_TRANSCRIPT_HINT_CHARS_FOR_AUTO_ORGANIZE = 280;
const MAX_SUMMARY_CHARS_FOR_AUTO_ORGANIZE = 360;
const MAX_TITLE_CHARS_FOR_AUTO_ORGANIZE = 100;
const MAX_OPEN_TASK_TITLES_FOR_AUTO_ORGANIZE = 5;
const MAX_OPEN_TASK_CHARS_FOR_AUTO_ORGANIZE = 72;

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

function buildAiExecutionContextFromSettings(): AiExecutionContext {
  const s = useSettingsStore.getState();
  const effectivePrivateAiProvider = resolveEffectivePrivateAiProvider(
    s.privateAiProvider,
    isProActiveFromStorageSync(),
  );

  return {
    selectedAIModel: s.selectedAIModel,
    aiModelRoutingMode: s.aiModelRoutingMode,
    selectedLocalAiModel: s.selectedLocalAiModel ?? DEFAULT_LOCAL_AI_MODEL_ID,
    isLocalLlmModelDownloaded:
      s.selectedLocalAiModel != null &&
      (s.localLlmModelStatuses[s.selectedLocalAiModel] ?? 'not_downloaded') === 'downloaded',
    summaryStyle: s.summaryStyle,
    taskStrictness: s.taskStrictness,
    aiOutputLanguage: s.aiOutputLanguage,
    aiExecutionMode: s.aiExecutionMode,
    privateLocalLlmBudget: s.privateLocalLlmBudget,
    privateRemoteOutputBudget: s.privateRemoteOutputBudget,
    privateRemotePreferJsonObject: s.privateRemotePreferJsonObject,
    privateCapabilityTier: s.privateCapabilityTier,
    privateAiProvider: effectivePrivateAiProvider,
    privateRemoteBaseUrl: s.privateRemoteBaseUrl,
    privateRemoteApiKey: s.privateRemoteApiKey,
    privateRemoteModel: s.privateRemoteModel,
    cloudMessageTtlSeconds: s.cloudAiKvTtlSeconds,
  };
}

function countNotesInFolder(records: VoiceRecord[], folderId: string): number {
  return records.filter((r) => r.status !== 'archived' && r.folderId === folderId).length;
}

function computeNoteAgeDays(createdAt: string): number | undefined {
  const createdMs = Date.parse(createdAt);
  if (Number.isNaN(createdMs)) return undefined;
  return Math.max(0, Math.floor((Date.now() - createdMs) / 86_400_000));
}

function buildAutoOrganizeTaskPayload(tasks: TaskItem[] | undefined): {
  taskCount?: number;
  openTaskCount?: number;
  openTasks?: string[];
  allTasksDone?: boolean;
} {
  const list = tasks ?? [];
  if (list.length === 0) return {};

  const openTaskItems = list.filter((task) => !task.isDone);
  const openTasks = openTaskItems
    .map((task) => truncateText(task.text, MAX_OPEN_TASK_CHARS_FOR_AUTO_ORGANIZE))
    .filter((text): text is string => Boolean(text))
    .slice(0, MAX_OPEN_TASK_TITLES_FOR_AUTO_ORGANIZE);

  if (openTaskItems.length > 0) {
    return {
      taskCount: list.length,
      openTaskCount: openTaskItems.length,
      openTasks,
    };
  }

  return {
    taskCount: list.length,
    allTasksDone: true,
  };
}

export function useAutoOrganizeFolders(
  records: VoiceRecord[],
  options?: UseAutoOrganizeFoldersOptions,
) {
  const { t, i18n } = useTranslation();
  const { isConnected } = useNetworkStatus();
  const folders = useFolderStore((s) => s.folders);
  const cloudAiKvTtlSeconds = useSettingsStore((s) => s.cloudAiKvTtlSeconds);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const [isRunning, setIsRunning] = useState(false);
  const [activeMode, setActiveMode] = useState<AutoOrganizeMode | null>(null);
  const cancelledRef = useRef(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  const usePrivateRemoteOrganize = useMemo(
    () => isPrivateCustomServerMode(aiExecutionMode, privateAiProvider),
    [aiExecutionMode, privateAiProvider],
  );

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const timerId = successTimerRef.current;

      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, []);

  const folderNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const folder of folders) {
      map.set(folder.id, folder.name);
    }
    return map;
  }, [folders]);

  const eligibleNotes = useMemo(
    () =>
      records
        .filter((r) => r.status !== 'archived')
        .slice(0, MAX_NOTES_FOR_SINGLE_REQUEST)
        .map((r) => {
          const titleTrimmed = r.title.trim();
          const hasSummary = Boolean(r.summary?.trim());
          const folderName = r.folderId ? folderNameById.get(r.folderId) : undefined;
          const ageDays = r.createdAt ? computeNoteAgeDays(r.createdAt) : undefined;
          const taskPayload = buildAutoOrganizeTaskPayload(r.tasks);

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
            ...(r.createdAt ? { createdAt: r.createdAt.slice(0, 10) } : {}),
            ...(ageDays != null ? { ageDays } : {}),
            ...(folderName ? { folderName } : {}),
            ...(r.isPinned ? { isPinned: true } : {}),
            ...(r.readAt ? { isRead: true } : {}),
            ...taskPayload,
          };
        }),
    [folderNameById, records],
  );

  const existingFoldersPayload = useMemo(
    () =>
      folders.map((f) => ({
        name: f.name,
        icon: f.icon,
        color: f.color,
        noteCount: countNotesInFolder(records, f.id),
      })),
    [folders, records],
  );

  const cancelAutoOrganize = useCallback(() => {
    cancelledRef.current = true;
    setIsRunning(false);
    setActiveMode(null);
  }, []);

  const validateBeforeRun = useCallback(
    (params: AutoOrganizeRunParams): boolean => {
      const template = normalizeAutoOrganizeTemplate(params.template);

      if (isProAutoOrganizeTemplate(template) && !isProActiveFromStorageSync()) {
        alertAiLimitExceeded(t('folders.aiOrganizeTemplates.proRequired'));
        return false;
      }

      if (isProAutoOrganizeMode(params.mode) && !isProActiveFromStorageSync()) {
        alertAiLimitExceeded(t('folders.aiOrganizeSheet.proRequired'));
        return false;
      }

      if (params.mode === 'consolidate_folders') {
        if (folders.length < 2) {
          Alert.alert(
            t('folders.aiOrganizeSheet.consolidateMinTitle'),
            t('folders.aiOrganizeSheet.consolidateMinDescription'),
          );
          return false;
        }
        return true;
      }

      if (params.mode === 'assign_existing') {
        if (folders.length === 0) {
          Alert.alert(
            t('folders.aiOrganizeSheet.assignMinTitle'),
            t('folders.aiOrganizeSheet.assignMinDescription'),
          );
          return false;
        }
      }

      if (eligibleNotes.length < MIN_NOTES_TO_AUTO_ORGANIZE) {
        Alert.alert(
          t('folders.autoOrganizeMinTitle'),
          t('folders.autoOrganizeMinDescription', {
            min: MIN_NOTES_TO_AUTO_ORGANIZE,
            count: eligibleNotes.length,
          }),
        );
        return false;
      }

      return true;
    },
    [eligibleNotes.length, folders.length, t],
  );

  const runAutoOrganize = useCallback(
    async (params: AutoOrganizeRunParams) => {
      if (isRunning || inFlightRef.current) {
        return;
      }

      if (!validateBeforeRun(params)) {
        return;
      }

      const mode = params.mode;
      const template = normalizeAutoOrganizeTemplate(params.template);

      if (isConnected === false && !usePrivateRemoteOrganize) {
        Alert.alert(t('common.error'), t('folders.autoOrganizeFailedDescription'));
        return;
      }

      cancelledRef.current = false;
      inFlightRef.current = true;
      setIsRunning(true);
      setActiveMode(mode);

      try {
        if (usePrivateRemoteOrganize) {
          const remoteResult = await runPrivateRemoteAutoOrganizeFolders(
            {
              appLanguage: i18n.language,
              mode,
              template,
              existingFolders: existingFoldersPayload,
              notes: eligibleNotes,
            },
            buildAiExecutionContextFromSettings(),
            { isCancelled: () => cancelledRef.current },
          );

          if (cancelledRef.current) return;

          if (!remoteResult.ok) {
            if (remoteResult.error === AI_REQUEST_CANCELLED) return;
            const safeMsg = isLikelyNetworkError(remoteResult.error)
              ? t('folders.autoOrganizeFailedDescription')
              : remoteResult.error;
            Alert.alert(t('common.error'), safeMsg);
            return;
          }

          await options?.onResult?.(remoteResult.result);
          return;
        }

        const consentOk = await ensureCloudAiThirdPartyConsent();

        if (!consentOk) {
          return;
        }

        const requestId = `auto-organize-${Date.now()}`;
        const postResult = await postAutoOrganizeFolders({
          id: requestId,
          appLanguage: i18n.language,
          mode,
          template,
          existingFolders: existingFoldersPayload,
          notes: eligibleNotes,
          messageTtlSeconds: cloudAiKvTtlSeconds,
        });
        if (!postResult.ok) {
          const isLimitExceeded = 'limitExceeded' in postResult && postResult.limitExceeded;
          const msg = isLimitExceeded
            ? postResult.reason === 'auto_organize_free_limit'
              ? getAutoOrganizeWeeklyLimitExceededMessage()
              : getAiWeeklyLimitExceededMessage()
            : postResult.error;
          const safeMsg =
            isString(msg) && isLikelyNetworkError(msg)
              ? t('folders.autoOrganizeFailedDescription')
              : msg;
          if (isLimitExceeded && isString(safeMsg)) {
            alertAiLimitExceeded(safeMsg);
          } else {
            Alert.alert(t('common.error'), safeMsg);
          }
          return;
        }

        if (cancelledRef.current) return;

        const pollResult = await pollAutoOrganizeFolders(
          requestId,
          { mode, template },
          postResult.data.syncToken,
          {
            isCancelled: () => cancelledRef.current,
          },
        );
        if (cancelledRef.current) return;
        if (!pollResult.ok) {
          if (pollResult.error === 'cancelled') return;
          Alert.alert(t('common.error'), t('folders.autoOrganizeFailedDescription'));
          return;
        }

        await options?.onResult?.(pollResult.result);
      } catch {
        if (!cancelledRef.current) {
          Alert.alert(t('common.error'), t('folders.autoOrganizeFailedDescription'));
        }
      } finally {
        if (!usePrivateRemoteOrganize) {
          requestAiUsageRefresh();
        }
        inFlightRef.current = false;
        if (!cancelledRef.current) {
          setIsRunning(false);
          setActiveMode(null);
        }
      }
    },
    [
      eligibleNotes,
      existingFoldersPayload,
      isConnected,
      isRunning,
      i18n.language,
      options,
      t,
      cloudAiKvTtlSeconds,
      usePrivateRemoteOrganize,
      validateBeforeRun,
    ],
  );

  return {
    runAutoOrganize,
    cancelAutoOrganize,
    isRunning,
    activeMode,
    overlayVisible: isRunning,
    overlayMode: isRunning ? ('loading' as const) : ('success' as const),
    eligibleCount: eligibleNotes.length,
    minRequired: MIN_NOTES_TO_AUTO_ORGANIZE,
  };
}
