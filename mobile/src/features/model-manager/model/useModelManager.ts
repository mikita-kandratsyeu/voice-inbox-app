import { useCallback } from 'react';

import type { WhisperModelId } from '@/entities/settings';
import { useSettingsStore, WHISPER_MODELS } from '@/entities/settings';

import { deleteWhisperModel } from '../lib/deleteWhisperModel';
import { cancelWhisperModelDownload, downloadWhisperModel } from '../lib/downloadWhisperModel';

export const useModelManager = () => {
  const setWhisperModelStatus = useSettingsStore((s) => s.setWhisperModelStatus);
  const setDownloadProgress = useSettingsStore((s) => s.setDownloadProgress);
  const removeWhisperModelStatus = useSettingsStore((s) => s.removeWhisperModelStatus);
  const setWhisperModel = useSettingsStore((s) => s.setWhisperModel);
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);

  const startDownload = useCallback(
    async (modelId: WhisperModelId): Promise<void> => {
      setWhisperModelStatus(modelId, 'downloading');
      setDownloadProgress(modelId, 0);

      const model = WHISPER_MODELS.find((m) => m.id === modelId);
      const expectedBytes = (model?.sizeMb ?? 0) * 1024 * 1024;

      try {
        const { promise } = downloadWhisperModel({
          modelId,
          expectedBytes,
          onProgress: (progress, bytesWritten, contentLength) => {
            setDownloadProgress(modelId, progress, bytesWritten, contentLength);
          },
        });

        await promise;
        setWhisperModelStatus(modelId, 'downloaded');
        setDownloadProgress(modelId, 100);
      } catch (err) {
        const isCancelled =
          err instanceof Error && (err.message.includes('cancel') || err.message.includes('abort'));

        if (!isCancelled) {
          setWhisperModelStatus(modelId, 'error');
        } else {
          setWhisperModelStatus(modelId, 'not_downloaded');
        }
        setDownloadProgress(modelId, 0);
      }
    },
    [setWhisperModelStatus, setDownloadProgress],
  );

  const cancelDownload = useCallback(
    async (modelId: WhisperModelId): Promise<void> => {
      await cancelWhisperModelDownload(modelId);
      setWhisperModelStatus(modelId, 'not_downloaded');
      setDownloadProgress(modelId, 0);
    },
    [setWhisperModelStatus, setDownloadProgress],
  );

  const removeModel = useCallback(
    async (modelId: WhisperModelId): Promise<void> => {
      await deleteWhisperModel(modelId);
      removeWhisperModelStatus(modelId);

      if (selectedWhisperModel === modelId) {
        setWhisperModel('whisper-base');
      }
    },
    [removeWhisperModelStatus, selectedWhisperModel, setWhisperModel],
  );

  return { startDownload, cancelDownload, removeModel };
};
