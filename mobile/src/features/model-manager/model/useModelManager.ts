import { useCallback } from 'react';

import {
  getLocalAiModelEntry,
  getRecommendedWhisperModelId,
  getWhisperModelVariantId,
  LOCAL_AI_MODELS,
  type LocalAiModelId,
  useSettingsStore,
  WHISPER_KIT_STORAGE_FORMAT,
  WHISPER_MODELS,
  type WhisperModelId,
  type WhisperModelStatus,
  type WhisperModelWeightsFormat,
} from '@/entities/settings';
import {
  cancelLocalLlmModelDownload,
  localLlmModelDownloader,
} from '@/features/model-manager/lib/local-llm-download';
import { shouldUseIosWhisperKitEngine } from '@/features/transcription/config/transcriptionEngine';
import { releaseLocalLlmSession } from '@/shared/lib/ai-core/localLlmSession';
import { diagWarn } from '@/shared/lib/appLogger';
import { NitroFS } from '@/shared/lib/fs';
import { getLocalLlmModelPath } from '@/shared/lib/local-llm';
import { getWhisperEstimatedDownloadBytes, getWhisperModelPath } from '@/shared/lib/whisper';
import {
  getWhisperKitEstimatedDownloadBytes,
  getWhisperKitModelsDir,
  mapWhisperModelIdToWhisperKitModel,
} from '@/shared/lib/whisper/whisperKitModelPath';

import { deleteLocalLlmModel } from '../lib/deleteLocalLlmModel';
import { deleteWhisperModel } from '../lib/deleteWhisperModel';
import {
  startLocalAiDownloadLiveActivity,
  startWhisperDownloadLiveActivity,
  stopLocalAiDownloadLiveActivity,
  stopWhisperDownloadLiveActivity,
  updateLocalAiDownloadLiveActivity,
  updateWhisperDownloadLiveActivity,
} from '../lib/downloadLiveActivity';
import { cancelWhisperModelDownload, whisperModelDownloader } from '../lib/whisper-download';
import {
  cancelWhisperKitModelDownload,
  whisperKitModelDownloader,
} from '../lib/whisper-kit-download';
import {
  deleteAllArgmaxTranscriptionModels,
  deleteWhisperKitModel,
  getWhisperKitModelStorageBytes,
  reconcileWhisperKitDownloadStatuses,
} from '../lib/whisperKitModelStorage';

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

  const startWhisperKitDownload = useCallback(
    async (modelId: WhisperModelId, options?: { expectedBytes?: number }): Promise<void> => {
      const kitFormat = WHISPER_KIT_STORAGE_FORMAT;
      setWhisperModelStatus(modelId, kitFormat, 'downloading');
      setDownloadProgress(modelId, kitFormat, 0, 0, 0, 'whisperkit');
      const expectedBytes = options?.expectedBytes ?? getWhisperKitEstimatedDownloadBytes(modelId);
      const whisperKitModel = mapWhisperModelIdToWhisperKitModel(modelId);

      await startWhisperDownloadLiveActivity(modelId, 'whisperkit').catch(() => {});

      try {
        await whisperKitModelDownloader.startDownload({
          modelId,
          whisperKitModel,
          modelCachePath: getWhisperKitModelsDir(),
          expectedBytes,
          onProgress: (progress, bytesWritten, contentLength, phase) => {
            setDownloadProgress(modelId, kitFormat, progress, bytesWritten, contentLength, phase);
            void updateWhisperDownloadLiveActivity(progress / 100, modelId, 'whisperkit').catch(
              () => {},
            );
          },
        });

        const actualBytes = await getWhisperKitModelStorageBytes(modelId);
        setWhisperModelStatus(modelId, kitFormat, 'downloaded');
        if (actualBytes > 0) {
          setDownloadProgress(modelId, kitFormat, 100, actualBytes, actualBytes);
        } else {
          setDownloadProgress(modelId, kitFormat, 100);
        }
        await stopWhisperDownloadLiveActivity();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isCancelled = message.includes('cancel') || message.includes('abort');
        const isAnotherDownload = message.includes('already in progress');

        if (isCancelled || isAnotherDownload) {
          setWhisperModelStatus(modelId, kitFormat, 'not_downloaded');
        } else {
          setWhisperModelStatus(modelId, kitFormat, 'error');
        }
        setDownloadProgress(modelId, kitFormat, 0);
        await stopWhisperDownloadLiveActivity();
      }
    },
    [setDownloadProgress, setWhisperModelStatus],
  );

  const startDownload = useCallback(
    async (
      modelId: WhisperModelId,
      options?: { format?: WhisperModelWeightsFormat; expectedBytes?: number },
    ): Promise<void> => {
      if (shouldUseIosWhisperKitEngine()) {
        await startWhisperKitDownload(modelId, {
          expectedBytes: options?.expectedBytes,
        });
        return;
      }

      const format = options?.format ?? whisperModelWeightsFormat;
      setWhisperModelStatus(modelId, format, 'downloading');
      setDownloadProgress(modelId, format, 0);
      const expectedBytes =
        options?.expectedBytes ?? (await getWhisperEstimatedDownloadBytes(modelId, format));

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
    [
      setWhisperModelStatus,
      setDownloadProgress,
      whisperModelWeightsFormat,
      startWhisperKitDownload,
    ],
  );

  const cancelDownload = useCallback(
    async (modelId: WhisperModelId): Promise<void> => {
      if (shouldUseIosWhisperKitEngine()) {
        const kitFormat = WHISPER_KIT_STORAGE_FORMAT;
        setWhisperModelStatus(modelId, kitFormat, 'not_downloaded');
        setDownloadProgress(modelId, kitFormat, 0);
        await stopWhisperDownloadLiveActivity().catch(() => {});
        void cancelWhisperKitModelDownload().catch((err) => {
          diagWarn('[whisperkit-download] background cancel failed', err);
        });
        return;
      }

      const format = whisperModelWeightsFormat;
      setWhisperModelStatus(modelId, format, 'not_downloaded');
      setDownloadProgress(modelId, format, 0);
      await stopWhisperDownloadLiveActivity().catch(() => {});

      // Immediate UI reset for both formats to avoid stuck "downloading" flags.
      setWhisperModelStatus(modelId, 'q5_1', 'not_downloaded');
      setWhisperModelStatus(modelId, 'full', 'not_downloaded');
      setDownloadProgress(modelId, 'q5_1', 0);
      setDownloadProgress(modelId, 'full', 0);

      // Do native/network cancellation in background so UI remains responsive.
      void cancelWhisperModelDownload(modelId).catch((err) => {
        diagWarn('[whisper-download] background cancel failed', err);
      });
    },
    [setWhisperModelStatus, setDownloadProgress, whisperModelWeightsFormat],
  );

  const removeModel = useCallback(
    async (modelId: WhisperModelId): Promise<void> => {
      if (shouldUseIosWhisperKitEngine()) {
        await deleteWhisperKitModel(modelId);
        removeWhisperModelStatus(modelId, WHISPER_KIT_STORAGE_FORMAT);
      } else {
        await deleteWhisperModel(modelId, whisperModelWeightsFormat);
        removeWhisperModelStatus(modelId, whisperModelWeightsFormat);
      }

      if (
        selectedWhisperModel === modelId &&
        (shouldUseIosWhisperKitEngine() || selectedWhisperModelFormat === whisperModelWeightsFormat)
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

  const syncWhisperKitDownloadedStatuses = useCallback(async (): Promise<void> => {
    await reconcileWhisperKitDownloadStatuses();
  }, []);

  const startLocalLlmDownload = useCallback(
    async (modelId: LocalAiModelId): Promise<void> => {
      const entry = getLocalAiModelEntry(modelId);
      if (!entry) return;

      setLocalLlmModelStatus(modelId, 'downloading');
      setLocalLlmDownloadProgress(modelId, 0);
      const expectedBytes = entry.sizeMb * 1024 * 1024;

      await startLocalAiDownloadLiveActivity(modelId, entry.name).catch(() => {});

      try {
        await localLlmModelDownloader.startDownload({
          modelId,
          expectedBytes,
          onProgress: (progress: number, bytesWritten: number, contentLength: number) => {
            setLocalLlmDownloadProgress(modelId, progress, bytesWritten, contentLength);
            void updateLocalAiDownloadLiveActivity(progress / 100, entry.name).catch(() => {});
          },
        });
        setLocalLlmModelStatus(modelId, 'downloaded');
        setLocalLlmDownloadProgress(modelId, 100);
        await stopLocalAiDownloadLiveActivity();
      } catch (err) {
        const isCancelled =
          err instanceof Error && (err.message.includes('cancel') || err.message.includes('abort'));

        if (!isCancelled) {
          setLocalLlmModelStatus(modelId, 'error');
        } else {
          setLocalLlmModelStatus(modelId, 'not_downloaded');
        }
        setLocalLlmDownloadProgress(modelId, 0);
        await stopLocalAiDownloadLiveActivity();
      }
    },
    [setLocalLlmDownloadProgress, setLocalLlmModelStatus],
  );

  const cancelLocalLlmDownloadFn = useCallback(
    async (modelId: LocalAiModelId): Promise<void> => {
      await cancelLocalLlmModelDownload();
      setLocalLlmModelStatus(modelId, 'not_downloaded');
      setLocalLlmDownloadProgress(modelId, 0);
      await stopLocalAiDownloadLiveActivity().catch(() => {});
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
    const checks = await Promise.all(
      LOCAL_AI_MODELS.map(async (m) => ({
        id: m.id,
        exists: await NitroFS.exists(getLocalLlmModelPath(m.id)),
      })),
    );

    const current = useSettingsStore.getState().localLlmModelStatuses;
    const next: Partial<Record<LocalAiModelId, WhisperModelStatus>> = { ...current };

    for (const item of checks) {
      if (current[item.id] === 'downloading') {
        next[item.id] = 'downloading';
        continue;
      }

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
    syncWhisperKitDownloadedStatuses,
    removeAllArgmaxTranscriptionModels: deleteAllArgmaxTranscriptionModels,
    startLocalLlmDownload,
    cancelLocalLlmDownload: cancelLocalLlmDownloadFn,
    removeLocalLlmModel: removeLocalLlmModelFn,
    syncLocalLlmDownloadedStatuses,
  };
};
