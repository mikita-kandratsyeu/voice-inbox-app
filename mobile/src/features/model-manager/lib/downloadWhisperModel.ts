import NitroFS from 'react-native-nitro-fs';

import type { WhisperModelId } from '@/entities/settings';
import {
  getWhisperModelPath,
  getWhisperModelsDir,
  WHISPER_MODEL_DOWNLOAD_URLS,
} from '@/shared/lib/whisper';

type DownloadOptions = {
  modelId: WhisperModelId;
  expectedBytes: number;
  onProgress: (progress: number, bytesWritten: number, contentLength: number) => void;
};

type DownloadResult = {
  jobId: number;
  promise: Promise<void>;
};

export const downloadWhisperModel = ({
  modelId,
  expectedBytes,
  onProgress,
}: DownloadOptions): DownloadResult => {
  const url = WHISPER_MODEL_DOWNLOAD_URLS[modelId];
  const destPath = getWhisperModelPath(modelId);
  const modelsDir = getWhisperModelsDir();

  const promise = (async () => {
    const dirExists = await NitroFS.exists(modelsDir);
    if (!dirExists) {
      await NitroFS.mkdir(modelsDir);
    }

    await NitroFS.downloadFile(url, destPath, (downloadedBytes: number, totalBytes: number) => {
      const total = totalBytes > 0 ? totalBytes : expectedBytes;
      const progress = total > 0 ? Math.round((downloadedBytes / total) * 100) : 0;
      onProgress(progress, downloadedBytes, total);
    });
  })();

  return { jobId: 0, promise };
};

export const cancelWhisperModelDownload = async (modelId: WhisperModelId): Promise<void> => {
  const destPath = getWhisperModelPath(modelId);
  const exists = await NitroFS.exists(destPath);

  if (exists) {
    await NitroFS.unlink(destPath);
  }
};
