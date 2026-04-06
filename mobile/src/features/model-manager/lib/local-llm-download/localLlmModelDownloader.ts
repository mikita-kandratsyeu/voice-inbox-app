import RNBlobUtil from 'react-native-blob-util';

import { getLocalAiModelEntry } from '@/entities/settings/model/constants';
import { NitroFS } from '@/shared/lib/fs';
import { getLocalLlmModelPath, getLocalLlmModelsDir } from '@/shared/lib/local-llm';
import { resolveLocalLlmWeightsDownload } from '@/shared/lib/model-manifest';

import type {
  LocalLlmDownloadSnapshot,
  StartLocalLlmDownloadOptions,
} from './localLlmDownloadTypes';

type BlobTask = {
  cancel: () => Promise<unknown> | unknown;
  progress: (
    config: { interval?: number; count?: number },
    cb: (received: number | string, total: number | string) => void,
  ) => void;
  then: Promise<unknown>['then'];
  catch: Promise<unknown>['catch'];
};

type BlobResponse = {
  info: () => { status: number };
};

const emptySnapshot = (): LocalLlmDownloadSnapshot => ({
  machineState: 'idle',
  modelId: null,
  jobId: null,
  lastError: null,
});

class LocalLlmModelDownloader {
  private snapshot: LocalLlmDownloadSnapshot = emptySnapshot();
  private listeners = new Set<(s: LocalLlmDownloadSnapshot) => void>();
  private runPromise: Promise<void> | null = null;
  private cancelRequested = false;
  private activeTask: BlobTask | null = null;
  private activeDownloadSettlement: Promise<void> | null = null;
  private taskCounter = 1;

  getSnapshot = (): LocalLlmDownloadSnapshot => ({ ...this.snapshot });

  subscribe = (listener: (s: LocalLlmDownloadSnapshot) => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit = (): void => {
    const s = this.getSnapshot();
    for (const l of this.listeners) l(s);
  };

  private setSnapshot = (patch: Partial<LocalLlmDownloadSnapshot>): void => {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  };

  private resetSnapshot = (): void => {
    this.snapshot = emptySnapshot();
    this.emit();
  };

  private startBlobDownload(
    url: string,
    toFile: string,
    onProgressRaw: (received: number, total: number) => void,
  ): Promise<BlobResponse> {
    const task = RNBlobUtil.config({ path: toFile, fileCache: true }).fetch('GET', url) as BlobTask;
    const jobId = this.taskCounter++;

    task.progress({ interval: 250 }, (received, total) => {
      const r = Number(received) || 0;
      const t = Number(total) || 0;
      onProgressRaw(r, t);
    });

    this.activeTask = task;
    this.setSnapshot({ jobId });

    const promise = task as unknown as Promise<BlobResponse>;
    this.activeDownloadSettlement = promise.then(
      () => {},
      () => {},
    );

    return promise;
  }

  private async runDownloadPipeline(options: StartLocalLlmDownloadOptions): Promise<void> {
    const { modelId, expectedBytes, onProgress } = options;
    const entry = getLocalAiModelEntry(modelId);
    if (!entry) {
      throw new Error('Unknown local LLM model');
    }

    const resolved = await resolveLocalLlmWeightsDownload(modelId);
    const weightsUrl = (resolved.url || entry.downloadUrl).trim();

    if (!weightsUrl) {
      throw new Error('No download URL for model');
    }

    const llmExpectedBytes =
      resolved.expectedBytes !== undefined ? resolved.expectedBytes : expectedBytes;
    const weightsPath = getLocalLlmModelPath(modelId);
    const modelsDir = getLocalLlmModelsDir();

    this.cancelRequested = false;

    if (__DEV__) {
      console.warn('[local-llm-download] start', { modelId, expectedBytes: llmExpectedBytes });
    }

    this.setSnapshot({
      machineState: 'pending',
      modelId,
      jobId: null,
      lastError: null,
    });

    if (!(await NitroFS.exists(modelsDir))) {
      await NitroFS.mkdir(modelsDir);
    }

    this.setSnapshot({ machineState: 'downloading' });

    let latest = 0;
    let lastEmitTs = 0;
    let lastProgress = -1;

    let weightsRes: BlobResponse;
    try {
      weightsRes = await this.startBlobDownload(weightsUrl, weightsPath, (received, totalRaw) => {
        const total = totalRaw > 0 ? totalRaw : llmExpectedBytes;
        latest = Math.max(latest, received);
        const pct = total > 0 ? Math.min(1, latest / total) : 0;
        const progress = Math.round(pct * 100);
        const now = Date.now();
        const shouldEmit = progress !== lastProgress && now - lastEmitTs >= 180;
        if (shouldEmit || progress === 100 || progress === 0) {
          lastEmitTs = now;
          lastProgress = progress;
          onProgress(progress, latest, total);
        }
      });
    } catch {
      if (this.cancelRequested) throw new Error('cancelled');
      throw new Error('Download failed');
    }

    this.activeTask = null;
    this.activeDownloadSettlement = null;
    this.setSnapshot({ jobId: null });

    if (weightsRes.info().status !== 200) {
      if (await NitroFS.exists(weightsPath)) await NitroFS.unlink(weightsPath).catch(() => {});
      throw new Error(`Download failed with status ${weightsRes.info().status}`);
    }
    if (this.cancelRequested) throw new Error('cancelled');

    onProgress(100, llmExpectedBytes, llmExpectedBytes);
    if (__DEV__) console.warn('[local-llm-download] completed', { modelId });
    this.setSnapshot({ machineState: 'completed', jobId: null });
    this.resetSnapshot();
  }

  private async executeDownload(options: StartLocalLlmDownloadOptions): Promise<void> {
    try {
      await this.runDownloadPipeline(options);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const msg = error.message.toLowerCase();
      const isCancel =
        error.message === 'cancelled' || msg.includes('cancel') || this.cancelRequested;

      if (isCancel) {
        this.setSnapshot({ machineState: 'cancelled', lastError: null });
        const path = getLocalLlmModelPath(options.modelId);
        if (await NitroFS.exists(path)) await NitroFS.unlink(path).catch(() => {});
        this.resetSnapshot();
        throw new Error('cancelled');
      }

      this.setSnapshot({ machineState: 'failed', lastError: error });
      const path = getLocalLlmModelPath(options.modelId);
      if (await NitroFS.exists(path)) await NitroFS.unlink(path).catch(() => {});
      this.resetSnapshot();
      throw error;
    }
  }

  startDownload = async (options: StartLocalLlmDownloadOptions): Promise<void> => {
    if (this.runPromise) {
      throw new Error('Another local LLM download is already in progress');
    }

    this.runPromise = this.executeDownload(options).finally(() => {
      this.runPromise = null;
    });

    return this.runPromise;
  };

  cancelLocalLlmDownload = async (): Promise<void> => {
    this.cancelRequested = true;
    try {
      this.activeTask?.cancel();
    } catch {
      if (__DEV__) console.warn('[local-llm-download] cancel failed');
    }
    await this.activeDownloadSettlement?.catch(() => {});
    this.activeTask = null;
    this.activeDownloadSettlement = null;
  };
}

export const localLlmModelDownloader = new LocalLlmModelDownloader();

export const cancelLocalLlmModelDownload = (): Promise<void> =>
  localLlmModelDownloader.cancelLocalLlmDownload();
