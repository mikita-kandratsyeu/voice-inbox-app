import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { unzip } from 'react-native-zip-archive';

import type { WhisperModelId } from '@/entities/settings';
import { NitroFS } from '@/shared/lib/fs';
import {
  getWhisperCoreMlDownloadUrl,
  getWhisperModelDownloadUrl,
  getWhisperModelPath,
  getWhisperModelsDir,
  removeWhisperCoreMlEncoder,
} from '@/shared/lib/whisper';

import type {
  StartWhisperModelDownloadOptions,
  WhisperDownloadSnapshot,
} from './whisperDownloadTypes';

const BIN_PROGRESS_WEIGHT = 0.88;
const COREML_PROGRESS_WEIGHT = 0.12;

const coreMlZipTempPath = (modelsDir: string, modelId: WhisperModelId): string =>
  `${modelsDir}/.${modelId}.coreml-encoder.zip`;

const emptySnapshot = (): WhisperDownloadSnapshot => ({
  machineState: 'idle',
  modelId: null,
  format: null,
  phase: null,
  jobId: null,
  lastError: null,
});

class WhisperModelDownloader {
  private snapshot: WhisperDownloadSnapshot = emptySnapshot();
  private listeners = new Set<(s: WhisperDownloadSnapshot) => void>();
  private runPromise: Promise<void> | null = null;

  private activeJobId: number | null = null;
  private activeDownloadSettlement: Promise<void> | null = null;

  private cancelRequested = false;

  getSnapshot = (): WhisperDownloadSnapshot => ({ ...this.snapshot });

  subscribe = (listener: (s: WhisperDownloadSnapshot) => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit = (): void => {
    const s = this.getSnapshot();
    for (const l of this.listeners) {
      l(s);
    }
  };

  private setSnapshot = (patch: Partial<WhisperDownloadSnapshot>): void => {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  };

  private resetSnapshot = (): void => {
    this.snapshot = emptySnapshot();
    this.emit();
  };

  private async deletePartialArtifacts(modelId: WhisperModelId): Promise<void> {
    const qPath = getWhisperModelPath(modelId, 'q5_1');
    const fullPath = getWhisperModelPath(modelId, 'full');
    if (await NitroFS.exists(qPath)) await NitroFS.unlink(qPath);
    if (fullPath !== qPath && (await NitroFS.exists(fullPath))) await NitroFS.unlink(fullPath);

    const zipPath = coreMlZipTempPath(getWhisperModelsDir(), modelId);
    if (await NitroFS.exists(zipPath)) {
      await NitroFS.unlink(zipPath);
    }
  }

  private async awaitActiveDownloadSettled(): Promise<void> {
    if (this.activeDownloadSettlement) {
      await this.activeDownloadSettlement.catch(() => {});
    }
    this.activeJobId = null;
    this.activeDownloadSettlement = null;
  }

  private async verifyPartialFileNotGrowing(path: string): Promise<void> {
    const isExists = await NitroFS.exists(path);

    if (!isExists) {
      return;
    }

    const a = (await NitroFS.stat(path)).size;
    await new Promise((r) => setTimeout(r, 140));
    const isExists2 = await NitroFS.exists(path);

    if (!isExists2) {
      return;
    }
    const b = (await NitroFS.stat(path)).size;

    if (b !== a && __DEV__) {
      console.warn('[whisper] Download target still changed size after cancel; cleaning up again');
      await NitroFS.unlink(path).catch(() => {});
    }
  }

  private attachDownload(jobId: number, promise: Promise<{ statusCode: number }>): void {
    this.activeJobId = jobId;
    this.setSnapshot({ jobId });
    this.activeDownloadSettlement = promise.then(
      () => {},
      () => {},
    );
  }

  private async runDownloadPipeline(options: StartWhisperModelDownloadOptions): Promise<void> {
    const { modelId, expectedBytes, onProgress } = options;
    const format = options.format ?? 'q5_1';
    const url = getWhisperModelDownloadUrl(modelId, format);
    const destPath = getWhisperModelPath(modelId, format);
    const modelsDir = getWhisperModelsDir();

    this.cancelRequested = false;
    this.setSnapshot({
      machineState: 'pending',
      modelId,
      format,
      phase: 'weights',
      jobId: null,
      lastError: null,
    });

    const dirExists = await NitroFS.exists(modelsDir);

    if (!dirExists) {
      await NitroFS.mkdir(modelsDir);
    }

    if (this.cancelRequested) {
      this.setSnapshot({ machineState: 'cancelled' });
      await this.deletePartialArtifacts(modelId);
      this.resetSnapshot();
      throw new Error('cancelled');
    }

    this.setSnapshot({ machineState: 'downloading', phase: 'weights' });

    const { jobId: weightsJobId, promise: weightsPromise } = RNFS.downloadFile({
      fromUrl: url,
      toFile: destPath,
      background: true,
      progressDivider: 1,
      progressInterval: 250,
      begin: (res) => {
        const total = res.contentLength > 0 ? res.contentLength : expectedBytes;
        onProgress(0, 0, total, 'weights');
      },
      progress: (res) => {
        const total = res.contentLength > 0 ? res.contentLength : expectedBytes;
        const binPct = total > 0 ? res.bytesWritten / total : 0;
        const progress = Math.round(binPct * BIN_PROGRESS_WEIGHT * 100);
        onProgress(progress, res.bytesWritten, total, 'weights');
      },
    });

    this.attachDownload(weightsJobId, weightsPromise);

    let weightsResult: { statusCode: number };
    try {
      weightsResult = await weightsPromise;
    } catch {
      if (this.cancelRequested) {
        this.setSnapshot({ machineState: 'cancelled' });
        await this.deletePartialArtifacts(modelId);
        this.resetSnapshot();
        throw new Error('cancelled');
      }
      throw new Error('Download failed');
    }

    this.activeJobId = null;
    this.activeDownloadSettlement = null;
    this.setSnapshot({ jobId: null });

    if (weightsResult.statusCode !== 200) {
      await NitroFS.exists(destPath).then((exists) => {
        if (exists) return NitroFS.unlink(destPath);
      });

      throw new Error(`Download failed with status ${weightsResult.statusCode}`);
    }

    if (this.cancelRequested) {
      this.setSnapshot({ machineState: 'cancelled' });
      await this.deletePartialArtifacts(modelId);
      this.resetSnapshot();

      throw new Error('cancelled');
    }

    if (Platform.OS === 'ios') {
      const zipPath = coreMlZipTempPath(modelsDir, modelId);
      const coreUrl = getWhisperCoreMlDownloadUrl(modelId);

      try {
        await NitroFS.unlink(zipPath).catch(() => {});
        await removeWhisperCoreMlEncoder(modelId).catch(() => {});

        if (this.cancelRequested) {
          this.setSnapshot({ machineState: 'cancelled' });
          await this.deletePartialArtifacts(modelId);
          this.resetSnapshot();
          throw new Error('cancelled');
        }

        this.setSnapshot({ phase: 'coreml' });

        const { jobId: zipJobId, promise: zipPromise } = RNFS.downloadFile({
          fromUrl: coreUrl,
          toFile: zipPath,
          background: true,
          progressDivider: 1,
          progressInterval: 250,
          begin: (res) => {
            const zipTotal = res.contentLength > 0 ? res.contentLength : 1;
            onProgress(Math.round(BIN_PROGRESS_WEIGHT * 100), 0, zipTotal, 'coreml');
          },
          progress: (res) => {
            const total = res.contentLength > 0 ? res.contentLength : 1;
            const zipPct = res.bytesWritten / total;
            const combined = Math.round(
              (BIN_PROGRESS_WEIGHT + zipPct * COREML_PROGRESS_WEIGHT) * 100,
            );
            onProgress(combined, res.bytesWritten, total, 'coreml');
          },
        });

        this.attachDownload(zipJobId, zipPromise);

        let zipResult: { statusCode: number };
        try {
          zipResult = await zipPromise;
        } catch {
          if (this.cancelRequested) {
            this.setSnapshot({ machineState: 'cancelled' });
            await this.deletePartialArtifacts(modelId);
            this.resetSnapshot();
            throw new Error('cancelled');
          }
          throw new Error('Core ML encoder download failed');
        }

        this.activeJobId = null;
        this.activeDownloadSettlement = null;
        this.setSnapshot({ jobId: null });

        if (this.cancelRequested) {
          this.setSnapshot({ machineState: 'cancelled' });
          await this.deletePartialArtifacts(modelId);
          this.resetSnapshot();
          throw new Error('cancelled');
        }

        if (zipResult.statusCode !== 200) {
          await NitroFS.unlink(zipPath).catch(() => {});
          if (__DEV__) {
            console.warn(
              `[whisper] Core ML encoder download failed (${zipResult.statusCode}), using CPU`,
            );
          }
          onProgress(100, expectedBytes, expectedBytes, 'weights');
        } else {
          await unzip(zipPath, modelsDir);
          await NitroFS.unlink(zipPath).catch(() => {});
        }
      } catch (e) {
        await NitroFS.unlink(coreMlZipTempPath(modelsDir, modelId)).catch(() => {});
        if (__DEV__) {
          console.warn('[whisper] Core ML encoder setup failed, using CPU', e);
        }
      }
    }

    onProgress(100, expectedBytes, expectedBytes, 'weights');
    this.setSnapshot({ machineState: 'completed', phase: null, jobId: null });
    this.resetSnapshot();
  }

  private async executeDownload(options: StartWhisperModelDownloadOptions): Promise<void> {
    try {
      await this.runDownloadPipeline(options);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.message === 'cancelled') {
        throw error;
      }

      const msg = error.message.toLowerCase();
      const isAbort =
        msg.includes('cancel') ||
        msg.includes('abort') ||
        this.cancelRequested ||
        (msg.includes('stop') && msg.includes('download'));

      if (isAbort || this.snapshot.machineState === 'cancelled') {
        this.setSnapshot({ machineState: 'cancelled', lastError: null });
        await this.deletePartialArtifacts(options.modelId);
        this.resetSnapshot();
        throw new Error('cancelled');
      }

      this.setSnapshot({ machineState: 'failed', lastError: error });
      await this.deletePartialArtifacts(options.modelId).catch(() => {});
      this.resetSnapshot();
      throw error;
    }
  }

  startDownload = async (options: StartWhisperModelDownloadOptions): Promise<void> => {
    const format = options.format ?? 'q5_1';

    if (this.runPromise) {
      if (this.snapshot.modelId === options.modelId && this.snapshot.format === format) {
        return this.runPromise;
      }
      throw new Error('Another Whisper model download is already in progress');
    }

    this.runPromise = this.executeDownload(options).finally(() => {
      this.runPromise = null;
    });

    return this.runPromise;
  };

  cancelWhisperModelDownload = async (modelId: WhisperModelId): Promise<void> => {
    if (this.snapshot.modelId !== modelId) {
      await this.deletePartialArtifacts(modelId);
      return;
    }

    this.cancelRequested = true;

    if (this.activeJobId != null) {
      const format = this.snapshot.format ?? 'q5_1';
      const beforeSizePath = getWhisperModelPath(modelId, format);

      await RNFS.stopDownload(this.activeJobId);
      await this.awaitActiveDownloadSettled();
      await this.verifyPartialFileNotGrowing(beforeSizePath);
    } else {
      await this.awaitActiveDownloadSettled();
    }

    await this.deletePartialArtifacts(modelId);
    this.setSnapshot({ machineState: 'cancelled', jobId: null, phase: null });
    this.resetSnapshot();

    if (this.runPromise) {
      await this.runPromise.catch(() => {});
    }
  };
}

export const whisperModelDownloader = new WhisperModelDownloader();

export const cancelWhisperModelDownload = (modelId: WhisperModelId): Promise<void> =>
  whisperModelDownloader.cancelWhisperModelDownload(modelId);
