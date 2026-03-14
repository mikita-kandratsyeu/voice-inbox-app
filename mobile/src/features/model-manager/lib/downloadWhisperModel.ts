import RNFS from 'react-native-fs';

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

const activeDownloads = new Map<WhisperModelId, number>();

export const downloadWhisperModel = ({
  modelId,
  expectedBytes,
  onProgress,
}: DownloadOptions): DownloadResult => {
  const url = WHISPER_MODEL_DOWNLOAD_URLS[modelId];
  const destPath = getWhisperModelPath(modelId);
  const modelsDir = getWhisperModelsDir();

  const promise = (async () => {
    const dirExists = await RNFS.exists(modelsDir);
    if (!dirExists) {
      await RNFS.mkdir(modelsDir);
    }

    const { jobId, promise: downloadPromise } = RNFS.downloadFile({
      fromUrl: url,
      toFile: destPath,
      background: true,
      progressDivider: 1,
      progressInterval: 250,
      progress: (res) => {
        const total = res.contentLength > 0 ? res.contentLength : expectedBytes;
        const progress = total > 0 ? Math.round((res.bytesWritten / total) * 100) : 0;
        onProgress(progress, res.bytesWritten, total);
      },
    });

    activeDownloads.set(modelId, jobId);

    const result = await downloadPromise;
    activeDownloads.delete(modelId);

    if (result.statusCode !== 200) {
      await RNFS.exists(destPath).then((exists) => {
        if (exists) return RNFS.unlink(destPath);
      });
      throw new Error(`Download failed with status ${result.statusCode}`);
    }
  })();

  return { jobId: 0, promise };
};

export const cancelWhisperModelDownload = async (modelId: WhisperModelId): Promise<void> => {
  const jobId = activeDownloads.get(modelId);
  if (jobId !== undefined) {
    await RNFS.stopDownload(jobId);
    activeDownloads.delete(modelId);

    const destPath = getWhisperModelPath(modelId);
    const exists = await RNFS.exists(destPath);
    if (exists) {
      await RNFS.unlink(destPath);
    }
  }
};
