import { useCallback } from 'react';

import type { WhisperModelId } from '@/entities/settings';
import {
  getRecommendedWhisperModelId,
  getWhisperModelSizeMb,
  useSettingsStore,
  type WhisperModelWeightsFormat,
} from '@/entities/settings';

import { deleteWhisperModel } from '../lib/deleteWhisperModel';
import {
  startWhisperDownloadLiveActivity,
  stopWhisperDownloadLiveActivity,
  updateWhisperDownloadLiveActivity,
} from '../lib/downloadLiveActivity';
import { cancelWhisperModelDownload, downloadWhisperModel } from '../lib/downloadWhisperModel';

export const useModelManager = () => {
  const setWhisperModelStatus = useSettingsStore((s) => s.setWhisperModelStatus);
  const setDownloadProgress = useSettingsStore((s) => s.setDownloadProgress);
  const removeWhisperModelStatus = useSettingsStore((s) => s.removeWhisperModelStatus);
  const setWhisperModel = useSettingsStore((s) => s.setWhisperModel);
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const whisperModelWeightsFormat = useSettingsStore((s) => s.whisperModelWeightsFormat);

  const startDownload = useCallback(
    async (
      modelId: WhisperModelId,
      options?: { format?: WhisperModelWeightsFormat; expectedBytes?: number },
    ): Promise<void> => {
      setWhisperModelStatus(modelId, 'downloading');
      setDownloadProgress(modelId, 0);
      const format = options?.format ?? whisperModelWeightsFormat;
      const expectedBytes =
        options?.expectedBytes ?? getWhisperModelSizeMb(modelId, format) * 1024 * 1024;

      await startWhisperDownloadLiveActivity(modelId).catch(() => {});

      try {
        const { promise } = downloadWhisperModel({
          modelId,
          format,
          expectedBytes,
          onProgress: (progress, bytesWritten, contentLength, phase) => {
            setDownloadProgress(modelId, progress, bytesWritten, contentLength, phase);
            void updateWhisperDownloadLiveActivity(progress / 100, modelId).catch(() => {});
          },
        });

        await promise;
        setWhisperModelStatus(modelId, 'downloaded');
        setDownloadProgress(modelId, 100);
        await stopWhisperDownloadLiveActivity();
      } catch (err) {
        const isCancelled =
          err instanceof Error && (err.message.includes('cancel') || err.message.includes('abort'));

        if (!isCancelled) {
          setWhisperModelStatus(modelId, 'error');
        } else {
          setWhisperModelStatus(modelId, 'not_downloaded');
        }
        setDownloadProgress(modelId, 0);
        await stopWhisperDownloadLiveActivity();
      }
    },
    [setWhisperModelStatus, setDownloadProgress, whisperModelWeightsFormat],
  );

  const cancelDownload = useCallback(
    async (modelId: WhisperModelId): Promise<void> => {
      await cancelWhisperModelDownload(modelId);
      setWhisperModelStatus(modelId, 'not_downloaded');
      setDownloadProgress(modelId, 0);
      await stopWhisperDownloadLiveActivity();
    },
    [setWhisperModelStatus, setDownloadProgress],
  );

  const removeModel = useCallback(
    async (modelId: WhisperModelId): Promise<void> => {
      await deleteWhisperModel(modelId);
      removeWhisperModelStatus(modelId);

      if (selectedWhisperModel === modelId) {
        setWhisperModel(getRecommendedWhisperModelId(whisperModelWeightsFormat));
      }
    },
    [removeWhisperModelStatus, selectedWhisperModel, setWhisperModel, whisperModelWeightsFormat],
  );

  return { startDownload, cancelDownload, removeModel };
};
