import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { unzip } from 'react-native-zip-archive';

import type { WhisperModelId } from '@/entities/settings';
import {
  getWhisperCoreMlDownloadUrl,
  getWhisperModelPath,
  getWhisperModelsDir,
  removeWhisperCoreMlEncoder,
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

const BIN_PROGRESS_WEIGHT = 0.88;
const COREML_PROGRESS_WEIGHT = 0.12;

const activeDownloads = new Map<WhisperModelId, number>();

const coreMlZipTempPath = (modelsDir: string, modelId: WhisperModelId): string =>
  `${modelsDir}/.${modelId}.coreml-encoder.zip`;

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

      begin: (res) => {
        const total = res.contentLength > 0 ? res.contentLength : expectedBytes;
        onProgress(0, 0, total);
      },
      progress: (res) => {
        const total = res.contentLength > 0 ? res.contentLength : expectedBytes;
        const binPct = total > 0 ? res.bytesWritten / total : 0;
        const progress = Math.round(binPct * BIN_PROGRESS_WEIGHT * 100);
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

    if (Platform.OS === 'ios') {
      const zipPath = coreMlZipTempPath(modelsDir, modelId);
      const coreUrl = getWhisperCoreMlDownloadUrl(modelId);

      try {
        await RNFS.unlink(zipPath).catch(() => {});
        await removeWhisperCoreMlEncoder(modelId).catch(() => {});

        const { jobId: zipJobId, promise: zipPromise } = RNFS.downloadFile({
          fromUrl: coreUrl,
          toFile: zipPath,
          background: true,
          progressDivider: 1,
          progressInterval: 250,
          begin: (res) => {
            const zipTotal = res.contentLength > 0 ? res.contentLength : 1;
            onProgress(Math.round(BIN_PROGRESS_WEIGHT * 100), 0, zipTotal);
          },
          progress: (res) => {
            const total = res.contentLength > 0 ? res.contentLength : 1;
            const zipPct = res.bytesWritten / total;
            const combined = Math.round(
              (BIN_PROGRESS_WEIGHT + zipPct * COREML_PROGRESS_WEIGHT) * 100,
            );
            onProgress(combined, res.bytesWritten, total);
          },
        });

        activeDownloads.set(modelId, zipJobId);
        const zipResult = await zipPromise;
        activeDownloads.delete(modelId);

        if (zipResult.statusCode !== 200) {
          await RNFS.unlink(zipPath).catch(() => {});
          if (__DEV__) {
            console.warn(
              `[whisper] Core ML encoder download failed (${zipResult.statusCode}), using CPU`,
            );
          }
          onProgress(100, expectedBytes, expectedBytes);
          return;
        }

        await unzip(zipPath, modelsDir);
        await RNFS.unlink(zipPath).catch(() => {});
      } catch (e) {
        await RNFS.unlink(zipPath).catch(() => {});
        if (__DEV__) {
          console.warn('[whisper] Core ML encoder setup failed, using CPU', e);
        }
      }
    }

    onProgress(100, expectedBytes, expectedBytes);
  })();

  return { jobId: 0, promise };
};

export const cancelWhisperModelDownload = async (modelId: WhisperModelId): Promise<void> => {
  const jobId = activeDownloads.get(modelId);
  if (jobId !== undefined) {
    await RNFS.stopDownload(jobId);
    activeDownloads.delete(modelId);
  }

  const destPath = getWhisperModelPath(modelId);
  const exists = await RNFS.exists(destPath);
  if (exists) {
    await RNFS.unlink(destPath);
  }

  const zipPath = coreMlZipTempPath(getWhisperModelsDir(), modelId);
  const zipExists = await RNFS.exists(zipPath);
  if (zipExists) {
    await RNFS.unlink(zipPath);
  }
};
