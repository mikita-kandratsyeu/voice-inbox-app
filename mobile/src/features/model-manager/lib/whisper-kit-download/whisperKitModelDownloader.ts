import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

import { devWarn, diagWarn } from '@/shared/lib/appLogger';

import type {
  StartWhisperKitModelDownloadOptions,
  WhisperKitDownloadSnapshot,
} from './whisperKitDownloadTypes';

const MODULE_NAME = 'VoiceInboxTranscriptionModule';

type NativeDownloadModule = {
  startModelDownload: (
    modelName: string,
    modelCachePath: string,
    jobId: string,
  ) => Promise<{ jobId: string; cancelled?: boolean }>;
  cancelModelDownload: () => Promise<void>;
};

const emptySnapshot = (): WhisperKitDownloadSnapshot => ({
  machineState: 'idle',
  modelId: null,
  jobId: null,
  lastError: null,
});

const getNativeModule = (): NativeDownloadModule | null => {
  if (Platform.OS !== 'ios') {
    return null;
  }
  const mod = NativeModules[MODULE_NAME] as NativeDownloadModule | undefined;
  if (!mod?.startModelDownload || !mod?.cancelModelDownload) {
    return null;
  }
  return mod;
};

class WhisperKitModelDownloader {
  private snapshot: WhisperKitDownloadSnapshot = emptySnapshot();
  private listeners = new Set<(s: WhisperKitDownloadSnapshot) => void>();
  private runPromise: Promise<void> | null = null;
  private cancelRequested = false;
  private eventSubscription: { remove: () => void } | null = null;
  private jobCounter = 1;

  getSnapshot = (): WhisperKitDownloadSnapshot => ({ ...this.snapshot });

  subscribe = (listener: (s: WhisperKitDownloadSnapshot) => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit = (): void => {
    const s = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(s);
    }
  };

  private setSnapshot = (patch: Partial<WhisperKitDownloadSnapshot>): void => {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  };

  private resetSnapshot = (): void => {
    this.snapshot = emptySnapshot();
    this.emit();
  };

  private teardownEvents = (): void => {
    this.eventSubscription?.remove();
    this.eventSubscription = null;
  };

  startDownload = (options: StartWhisperKitModelDownloadOptions): Promise<void> => {
    if (this.runPromise) {
      if (this.snapshot.modelId === options.modelId) {
        return this.runPromise;
      }
      throw new Error('Another WhisperKit model download is already in progress');
    }

    this.runPromise = this.runDownloadPipeline(options).finally(() => {
      this.runPromise = null;
      this.teardownEvents();
    });

    return this.runPromise;
  };

  cancel = async (): Promise<void> => {
    this.cancelRequested = true;
    const mod = getNativeModule();
    if (mod) {
      await mod.cancelModelDownload().catch((err) => {
        diagWarn('[whisperkit-download] cancel failed', err);
      });
    }
    this.teardownEvents();
    this.resetSnapshot();
  };

  private async runDownloadPipeline(options: StartWhisperKitModelDownloadOptions): Promise<void> {
    const mod = getNativeModule();
    if (!mod) {
      throw new Error('WhisperKit download is only available on iOS');
    }

    const { modelId, whisperKitModel, modelCachePath, expectedBytes, onProgress } = options;
    const jobId = `whisperkit-${modelId}-${this.jobCounter++}`;
    this.cancelRequested = false;

    this.setSnapshot({
      machineState: 'downloading',
      modelId,
      jobId,
      lastError: null,
    });

    devWarn('[whisperkit-download] start', { modelId, whisperKitModel, expectedBytes });

    const emitter = new NativeEventEmitter(NativeModules[MODULE_NAME]);
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      this.teardownEvents();
      fn();
    };

    await new Promise<void>((resolve, reject) => {
      this.eventSubscription = emitter.addListener(
        'whisperKitModelDownloadProgress',
        (payload: {
          jobId?: string;
          progress?: number;
          fraction?: number;
          phase?: string;
          bytesOnDisk?: number;
        }) => {
          if (payload.jobId !== jobId) return;
          const fraction =
            typeof payload.fraction === 'number'
              ? payload.fraction
              : typeof payload.progress === 'number'
                ? payload.progress / 100
                : 0;
          const progress = Math.min(100, Math.max(0, Math.round(fraction * 100)));
          const phase =
            payload.phase === 'preparing' ? 'whisperkit_prepare' : ('whisperkit' as const);
          const bytesOnDisk =
            typeof payload.bytesOnDisk === 'number' && Number.isFinite(payload.bytesOnDisk)
              ? Math.max(0, payload.bytesOnDisk)
              : 0;
          const totalBytes = Math.max(expectedBytes, bytesOnDisk);
          const writtenBytes =
            phase === 'whisperkit_prepare'
              ? Math.max(bytesOnDisk, Math.round(totalBytes * 0.82))
              : Math.max(bytesOnDisk, Math.round(totalBytes * fraction));
          onProgress(progress, writtenBytes, totalBytes, phase);
        },
      );

      const completedSub = emitter.addListener(
        'whisperKitModelDownloadCompleted',
        (payload: { jobId?: string }) => {
          if (payload.jobId !== jobId) return;
          completedSub.remove();
          failedSub.remove();
          cancelledSub.remove();
          settle(() => {
            this.resetSnapshot();
            resolve();
          });
        },
      );

      const failedSub = emitter.addListener(
        'whisperKitModelDownloadFailed',
        (payload: { jobId?: string; message?: string }) => {
          if (payload.jobId !== jobId) return;
          completedSub.remove();
          failedSub.remove();
          cancelledSub.remove();
          const message = payload.message ?? 'WhisperKit download failed';
          settle(() => {
            this.setSnapshot({ machineState: 'idle', lastError: message });
            reject(new Error(message));
          });
        },
      );

      const cancelledSub = emitter.addListener(
        'whisperKitModelDownloadCancelled',
        (payload: { jobId?: string }) => {
          if (payload.jobId !== jobId) return;
          completedSub.remove();
          failedSub.remove();
          cancelledSub.remove();
          settle(() => {
            this.resetSnapshot();
            reject(new Error('download_cancelled'));
          });
        },
      );

      void mod.startModelDownload(whisperKitModel, modelCachePath, jobId).catch((err: unknown) => {
        completedSub.remove();
        failedSub.remove();
        cancelledSub.remove();
        if (this.cancelRequested) {
          settle(() => {
            this.resetSnapshot();
            reject(new Error('download_cancelled'));
          });
          return;
        }
        const message = err instanceof Error ? err.message : String(err);
        settle(() => {
          this.setSnapshot({ machineState: 'idle', lastError: message });
          reject(err instanceof Error ? err : new Error(message));
        });
      });
    });
  }
}

export const whisperKitModelDownloader = new WhisperKitModelDownloader();

export const cancelWhisperKitModelDownload = (): Promise<void> =>
  whisperKitModelDownloader.cancel();
