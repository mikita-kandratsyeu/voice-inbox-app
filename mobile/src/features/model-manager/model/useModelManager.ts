import { useCallback } from 'react';

import {
  getLocalAiModelEntry,
  getRecommendedWhisperModelId,
  getWhisperModelSizeMb,
  getWhisperModelVariantId,
  LOCAL_AI_MODELS,
  type LocalAiModelId,
  useSettingsStore,
  WHISPER_MODELS,
  type WhisperModelId,
  type WhisperModelStatus,
  type WhisperModelWeightsFormat,
} from '@/entities/settings';
import {
  cancelLocalLlmModelDownload,
  localLlmModelDownloader,
} from '@/features/model-manager/lib/local-llm-download';
import { releaseLocalLlmSession } from '@/shared/lib/ai-core/localLlmSession';
import { NitroFS } from '@/shared/lib/fs';
import { getLocalLlmModelPath } from '@/shared/lib/local-llm';
import { getWhisperModelPath } from '@/shared/lib/whisper';

import { deleteLocalLlmModel } from '../lib/deleteLocalLlmModel';
import { deleteWhisperModel } from '../lib/deleteWhisperModel';
import {
  startWhisperDownloadLiveActivity,
  stopWhisperDownloadLiveActivity,
  updateWhisperDownloadLiveActivity,
} from '../lib/downloadLiveActivity';
import { cancelWhisperModelDownload, whisperModelDownloader } from '../lib/whisper-download';

export const useModelManager = () => {
  const setWhisperModelStatus = useSettingsStore((s) => s.setWhisperModelStatus);
  const setWhisperModelStatuses = useSettingsStore((s) => s.setWhisperModelStatuses);
  const setDownloadProgress = useSettingsStore((s) => s.setDownloadProgress);
  const removeWhisperModelStatus = useSettingsStore((s) => s.removeWhisperModelStatus);
  const setWhisperModel = useSettingsStore((s) => s.setWhisperModel);
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const selectedWhisperModelFormat = useSettingsStore((s) => s.selectedWhisperModelFormat);
  const whisperModelWeightsFormat = useSettingsStore((s) => s.whisperModelWeightsFormat);
  const setLocalLlmModelStatus = useSettingsStore((s) => s.setLocalLlmModelStatus);
  const setLocalLlmModelStatuses = useSettingsStore((s) => s.setLocalLlmModelStatuses);
  const setLocalLlmDownloadProgress = useSettingsStore((s) => s.setLocalLlmDownloadProgress);
  const removeLocalLlmModelStatus = useSettingsStore((s) => s.removeLocalLlmModelStatus);
  const selectedLocalAiModel = useSettingsStore((s) => s.selectedLocalAiModel);

  const startDownload = useCallback(
    async (
      modelId: WhisperModelId,
      options?: { format?: WhisperModelWeightsFormat; expectedBytes?: number },
    ): Promise<void> => {
      const format = options?.format ?? whisperModelWeightsFormat;
      setWhisperModelStatus(modelId, format, 'downloading');
      setDownloadProgress(modelId, format, 0);
      const expectedBytes =
        options?.expectedBytes ?? getWhisperModelSizeMb(modelId, format) * 1024 * 1024;

      await startWhisperDownloadLiveActivity(modelId).catch(() => {});

      try {
        await whisperModelDownloader.startDownload({
          modelId,
          format,
          expectedBytes,
          onProgress: (progress, bytesWritten, contentLength, phase) => {
            setDownloadProgress(modelId, format, progress, bytesWritten, contentLength, phase);
            void updateWhisperDownloadLiveActivity(progress / 100, modelId).catch(() => {});
          },
        });

        setWhisperModelStatus(modelId, format, 'downloaded');
        setDownloadProgress(modelId, format, 100);
        await stopWhisperDownloadLiveActivity();
      } catch (err) {
        const isCancelled =
          err instanceof Error && (err.message.includes('cancel') || err.message.includes('abort'));

        if (!isCancelled) {
          setWhisperModelStatus(modelId, format, 'error');
        } else {
          setWhisperModelStatus(modelId, format, 'not_downloaded');
        }
        setDownloadProgress(modelId, format, 0);
        await stopWhisperDownloadLiveActivity();
      }
    },
    [setWhisperModelStatus, setDownloadProgress, whisperModelWeightsFormat],
  );

  const cancelDownload = useCallback(
    async (modelId: WhisperModelId): Promise<void> => {
      // Immediate UI reset for both formats to avoid stuck "downloading" flags.
      setWhisperModelStatus(modelId, 'q5_1', 'not_downloaded');
      setWhisperModelStatus(modelId, 'full', 'not_downloaded');
      setDownloadProgress(modelId, 'q5_1', 0);
      setDownloadProgress(modelId, 'full', 0);
      await stopWhisperDownloadLiveActivity().catch(() => {});

      // Do native/network cancellation in background so UI remains responsive.
      void cancelWhisperModelDownload(modelId).catch((err) => {
        if (__DEV__) {
          console.warn('[whisper-download] background cancel failed', err);
        }
      });
    },
    [setWhisperModelStatus, setDownloadProgress],
  );

  const removeModel = useCallback(
    async (modelId: WhisperModelId): Promise<void> => {
      await deleteWhisperModel(modelId, whisperModelWeightsFormat);
      removeWhisperModelStatus(modelId, whisperModelWeightsFormat);

      if (
        selectedWhisperModel === modelId &&
        selectedWhisperModelFormat === whisperModelWeightsFormat
      ) {
        setWhisperModel(getRecommendedWhisperModelId(whisperModelWeightsFormat));
      }
    },
    [
      removeWhisperModelStatus,
      selectedWhisperModel,
      selectedWhisperModelFormat,
      setWhisperModel,
      whisperModelWeightsFormat,
    ],
  );

  const startLocalLlmDownload = useCallback(
    async (modelId: LocalAiModelId): Promise<void> => {
      const entry = getLocalAiModelEntry(modelId);
      if (!entry) return;

      setLocalLlmModelStatus(modelId, 'downloading');
      setLocalLlmDownloadProgress(modelId, 0);
      const expectedBytes = entry.sizeMb * 1024 * 1024;

      try {
        await localLlmModelDownloader.startDownload({
          modelId,
          expectedBytes,
          onProgress: (progress: number, bytesWritten: number, contentLength: number) => {
            setLocalLlmDownloadProgress(modelId, progress, bytesWritten, contentLength);
          },
        });
        setLocalLlmModelStatus(modelId, 'downloaded');
        setLocalLlmDownloadProgress(modelId, 100);
      } catch (err) {
        const isCancelled =
          err instanceof Error && (err.message.includes('cancel') || err.message.includes('abort'));

        if (!isCancelled) {
          setLocalLlmModelStatus(modelId, 'error');
        } else {
          setLocalLlmModelStatus(modelId, 'not_downloaded');
        }
        setLocalLlmDownloadProgress(modelId, 0);
      }
    },
    [setLocalLlmDownloadProgress, setLocalLlmModelStatus],
  );

  const cancelLocalLlmDownloadFn = useCallback(
    async (modelId: LocalAiModelId): Promise<void> => {
      await cancelLocalLlmModelDownload();
      setLocalLlmModelStatus(modelId, 'not_downloaded');
      setLocalLlmDownloadProgress(modelId, 0);
    },
    [setLocalLlmDownloadProgress, setLocalLlmModelStatus],
  );

  const removeLocalLlmModelFn = useCallback(
    async (modelId: LocalAiModelId): Promise<void> => {
      await deleteLocalLlmModel(modelId);
      removeLocalLlmModelStatus(modelId);
      if (selectedLocalAiModel === modelId) {
        void releaseLocalLlmSession();
      }
    },
    [removeLocalLlmModelStatus, selectedLocalAiModel],
  );

  const syncLocalLlmDownloadedStatuses = useCallback(async (): Promise<void> => {
    const prev = useSettingsStore.getState().localLlmModelStatuses;
    const next: Partial<Record<LocalAiModelId, WhisperModelStatus>> = { ...prev };

    const checks = await Promise.all(
      LOCAL_AI_MODELS.map(async (m) => ({
        id: m.id,
        exists: await NitroFS.exists(getLocalLlmModelPath(m.id)),
      })),
    );

    for (const item of checks) {
      if (item.exists) {
        next[item.id] = 'downloaded';
      } else if (next[item.id] === 'downloaded') {
        delete next[item.id];
      }
    }

    setLocalLlmModelStatuses(next);
  }, [setLocalLlmModelStatuses]);

  const syncDownloadedStatusesForFormat = useCallback(
    async (format: WhisperModelWeightsFormat): Promise<void> => {
      const checks = await Promise.all(
        WHISPER_MODELS.map(async (model) => ({
          id: model.id,
          exists: await NitroFS.exists(getWhisperModelPath(model.id, format)),
        })),
      );

      if (useSettingsStore.getState().whisperModelWeightsFormat !== format) {
        return;
      }

      const nextStatuses = { ...useSettingsStore.getState().whisperModelStatuses };
      for (const item of checks) {
        const key = getWhisperModelVariantId(item.id, format);
        if (item.exists) {
          nextStatuses[key] = 'downloaded';
        } else if (nextStatuses[key] === 'downloaded') {
          delete nextStatuses[key];
        }
      }
      setWhisperModelStatuses(nextStatuses);
    },
    [setWhisperModelStatuses],
  );

  return {
    startDownload,
    cancelDownload,
    removeModel,
    syncDownloadedStatusesForFormat,
    startLocalLlmDownload,
    cancelLocalLlmDownload: cancelLocalLlmDownloadFn,
    removeLocalLlmModel: removeLocalLlmModelFn,
    syncLocalLlmDownloadedStatuses,
  };
};
