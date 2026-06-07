import RNBlobUtil from 'react-native-blob-util';
import { unzip } from 'react-native-zip-archive';

import type { WhisperModelId } from '@/entities/settings';
import { getWhisperCoreMlSizeMb } from '@/entities/settings/model/constants';
import { IS_IOS } from '@/shared/lib';
import { devWarn, diagWarn } from '@/shared/lib/appLogger';
import { NitroFS } from '@/shared/lib/fs';
import {
  resolveWhisperCoreMlDownload,
  resolveWhisperWeightsDownload,
} from '@/shared/lib/model-manifest';
import {
  getWhisperCoreMlZipTempPath,
  getWhisperModelPath,
  getWhisperModelsDir,
  isWhisperCoreMlEncoderInstalled,
  removeWhisperCoreMlEncoder,
} from '@/shared/lib/whisper';

import type {
  StartWhisperModelDownloadOptions,
  WhisperDownloadSnapshot,
} from './whisperDownloadTypes';

/** Paths passed to native unzip must not use `file://` or URL-encoded segments (iOS). */
const pathForNativeUnzip = (input: string): string => {
  const noScheme = input.replace(/^file:\/\//, '');
  if (!/%[0-9A-Fa-f]{2}/.test(noScheme)) return noScheme;
  try {
    return decodeURIComponent(noScheme);
  } catch {
    return noScheme;
  }
};

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
  /** When `fileCache` is used, data may live at this path instead of the requested `path`. */
  path?: () => string;
};

const blobResponseStoragePath = (res: BlobResponse, requestedPath: string): string => {
  if (typeof res.path !== 'function') return requestedPath;
  try {
    const p = res.path();
    return typeof p === 'string' && p.length > 0 ? p : requestedPath;
  } catch {
    return requestedPath;
  }
};

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function coreMlZipVisible(normalizedPath: string): Promise<boolean> {
  if (await NitroFS.exists(normalizedPath)) return true;
  try {
    return Boolean(await RNBlobUtil.fs.exists(normalizedPath));
  } catch {
    return false;
  }
}

async function resolveCoreMlZipPathForUnzip(
  zipRes: BlobResponse,
  requestedZipPath: string,
): Promise<string> {
  const fromResp = blobResponseStoragePath(zipRes, requestedZipPath);
  const candidates = Array.from(
    new Set([pathForNativeUnzip(fromResp), pathForNativeUnzip(requestedZipPath)]),
  );

  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) {
    for (const c of candidates) {
      if (await coreMlZipVisible(c)) {
        return c;
      }
    }
    await sleep(40);
  }

  let pathFromRes = '';
  try {
    pathFromRes = typeof zipRes.path === 'function' ? String(zipRes.path()) : '';
  } catch {
    pathFromRes = '';
  }

  throw new Error(
    `Core ML zip not found after download (tried ${candidates.join(' | ')}); path()=${pathFromRes}`,
  );
}

async function coreMlZipFileSizeByLayer(normalizedPath: string): Promise<{
  nitro: number;
  blob: number;
}> {
  let nitro = 0;
  if (await NitroFS.exists(normalizedPath)) {
    try {
      nitro = (await NitroFS.stat(normalizedPath)).size;
    } catch {
      nitro = 0;
    }
  }
  let blob = 0;
  try {
    if (await RNBlobUtil.fs.exists(normalizedPath)) {
      const st = await RNBlobUtil.fs.stat(normalizedPath);
      blob = typeof st.size === 'number' ? st.size : Number(st.size);
    }
  } catch {
    blob = 0;
  }
  return { nitro, blob };
}

/** RNBlobUtil may finish before NitroFS stat reflects size; also Nitro can report 0 for RN-written files. */
async function waitForCoreMlZipMinSize(
  normalizedPath: string,
  minBytes: number,
  deadlineMs: number,
): Promise<number> {
  const deadline = Date.now() + deadlineMs;
  let last = 0;
  while (Date.now() < deadline) {
    const { nitro, blob } = await coreMlZipFileSizeByLayer(normalizedPath);
    last = Math.max(nitro, blob);
    if (last >= minBytes) {
      return last;
    }
    await sleep(50);
  }
  return last;
}

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
  private cancelInFlight: Promise<void> | null = null;
  private cancelRequested = false;
  private lastLoggedProgressBucket = -1;
  private activeTask: BlobTask | null = null;
  private activeDownloadSettlement: Promise<void> | null = null;
  private taskCounter = 1;
  private sessionCounter = 1;
  private activeSessionId: number | null = null;

  getSnapshot = (): WhisperDownloadSnapshot => ({ ...this.snapshot });

  subscribe = (listener: (s: WhisperDownloadSnapshot) => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit = (): void => {
    const s = this.getSnapshot();
    for (const l of this.listeners) l(s);
  };

  private setSnapshot = (patch: Partial<WhisperDownloadSnapshot>): void => {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  };

  private resetSnapshot = (): void => {
    this.snapshot = emptySnapshot();
    this.emit();
  };

  private async deletePartialArtifacts(
    modelId: WhisperModelId,
    opts?: { sessionId?: number; force?: boolean },
  ): Promise<void> {
    if (!opts?.force && opts?.sessionId != null && this.activeSessionId !== opts.sessionId) {
      devWarn('[whisper-download] skip cleanup from stale session', {
        sessionId: opts.sessionId,
        activeSessionId: this.activeSessionId,
        modelId,
      });
      return;
    }

    const qPath = getWhisperModelPath(modelId, 'q5_1');
    const fullPath = getWhisperModelPath(modelId, 'full');
    if (await NitroFS.exists(qPath)) await NitroFS.unlink(qPath);
    if (fullPath !== qPath && (await NitroFS.exists(fullPath))) await NitroFS.unlink(fullPath);

    const zipPath = getWhisperCoreMlZipTempPath(modelId);
    if (await NitroFS.exists(zipPath)) await NitroFS.unlink(zipPath);
    const legacyZip = `${getWhisperModelsDir()}/.${modelId}.coreml-encoder.zip`;
    if (await NitroFS.exists(legacyZip)) await NitroFS.unlink(legacyZip);
  }

  private async awaitActiveDownloadSettledWithTimeout(timeoutMs: number): Promise<void> {
    if (!this.activeDownloadSettlement) {
      this.activeTask = null;
      return;
    }

    let didTimeout = false;
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        didTimeout = true;
        resolve();
      }, timeoutMs);
    });

    await Promise.race([this.activeDownloadSettlement.catch(() => {}), timeoutPromise]);

    if (didTimeout) {
      devWarn('[whisper-download] native task did not settle in time, forcing JS cleanup');
    }

    this.activeTask = null;
    this.activeDownloadSettlement = null;
  }

  private async verifyPartialFileNotGrowing(path: string): Promise<void> {
    const existsA = await NitroFS.exists(path);
    if (!existsA) return;
    const sizeA = (await NitroFS.stat(path)).size;
    await new Promise((r) => setTimeout(r, 160));
    const existsB = await NitroFS.exists(path);
    if (!existsB) return;
    const sizeB = (await NitroFS.stat(path)).size;
    if (sizeB !== sizeA) {
      devWarn('[whisper-download] file still growing after cancel, deleting again');
      await NitroFS.unlink(path).catch(() => {});
    }
  }

  private startBlobDownload(
    url: string,
    toFile: string,
    onProgressRaw: (received: number, total: number) => void,
    options?: { fileCache?: boolean },
  ): Promise<BlobResponse> {
    const task = RNBlobUtil.config({
      path: toFile,
      fileCache: options?.fileCache ?? true,
      IOSBackgroundTask: true,
    }).fetch('GET', url) as BlobTask;
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

  private async runDownloadPipeline(options: StartWhisperModelDownloadOptions): Promise<void> {
    const { modelId, expectedBytes, onProgress } = options;
    const format = options.format ?? 'q5_1';
    const weightsResolved = await resolveWhisperWeightsDownload(modelId, format);
    const weightsUrl = weightsResolved.url;
    const weightsExpectedBytes =
      weightsResolved.expectedBytes !== undefined ? weightsResolved.expectedBytes : expectedBytes;
    const weightsPath = getWhisperModelPath(modelId, format);
    const modelsDir = getWhisperModelsDir();

    const sessionId = this.sessionCounter++;
    this.activeSessionId = sessionId;

    this.cancelRequested = false;
    this.lastLoggedProgressBucket = -1;

    devWarn('[whisper-download] start', {
      modelId,
      format,
      expectedBytes: weightsExpectedBytes,
      sessionId,
    });

    this.setSnapshot({
      machineState: 'pending',
      modelId,
      format,
      phase: 'weights',
      jobId: null,
      lastError: null,
    });

    if (!(await NitroFS.exists(modelsDir))) {
      await NitroFS.mkdir(modelsDir);
    }

    const coreMlNeeded = IS_IOS && !(await isWhisperCoreMlEncoderInstalled(modelId));
    const coreResolvedForPlan = coreMlNeeded ? await resolveWhisperCoreMlDownload(modelId) : null;
    const coreMlPlanBytes = coreMlNeeded
      ? (coreResolvedForPlan?.expectedBytes ?? getWhisperCoreMlSizeMb(modelId) * 1024 * 1024)
      : 0;
    const totalDownloadBytes = Math.max(1, weightsExpectedBytes + coreMlPlanBytes);

    this.setSnapshot({ machineState: 'downloading', phase: 'weights' });
    let latestWeights = 0;
    let lastWeightsEmitTs = 0;
    let lastWeightsProgress = -1;

    let weightsRes: BlobResponse;
    try {
      weightsRes = await this.startBlobDownload(weightsUrl, weightsPath, (received) => {
        latestWeights = Math.max(latestWeights, received);
        const progress = Math.min(100, Math.round((latestWeights / totalDownloadBytes) * 100));
        const now = Date.now();
        const shouldEmit = progress !== lastWeightsProgress && now - lastWeightsEmitTs >= 180;
        if (shouldEmit || progress === 100 || progress === 0) {
          lastWeightsEmitTs = now;
          lastWeightsProgress = progress;
          onProgress(progress, latestWeights, totalDownloadBytes, 'weights');
        }
        const bucket = Math.floor(progress / 10);
        if (bucket > this.lastLoggedProgressBucket) {
          this.lastLoggedProgressBucket = bucket;
          devWarn('[whisper-download] weights progress', {
            progress,
            written: latestWeights,
            totalDownloadBytes,
          });
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

    if (coreMlNeeded && coreResolvedForPlan) {
      const zipPath = getWhisperCoreMlZipTempPath(modelId);
      const coreUrl = coreResolvedForPlan.url;
      const coreExpectedBytes = coreResolvedForPlan.expectedBytes;
      let latestZip = 0;
      let zipTotal = coreMlPlanBytes;
      let lastZipEmitTs = 0;
      let lastZipProgress = -1;

      try {
        await NitroFS.unlink(`${modelsDir}/.${modelId}.coreml-encoder.zip`).catch(() => {});
        await NitroFS.unlink(zipPath).catch(() => {});
        await removeWhisperCoreMlEncoder(modelId).catch(() => {});
        this.setSnapshot({ phase: 'coreml' });

        let zipRes: BlobResponse;
        try {
          zipRes = await this.startBlobDownload(
            coreUrl,
            zipPath,
            (received, totalRaw) => {
              zipTotal =
                totalRaw > 0
                  ? totalRaw
                  : coreExpectedBytes !== undefined
                    ? coreExpectedBytes
                    : Math.max(zipTotal, 1);
              latestZip = Math.max(latestZip, received);
              const written = weightsExpectedBytes + latestZip;
              const progress = Math.min(100, Math.round((written / totalDownloadBytes) * 100));
              const now = Date.now();
              const shouldEmit = progress !== lastZipProgress && now - lastZipEmitTs >= 180;
              if (shouldEmit || progress >= 100) {
                lastZipEmitTs = now;
                lastZipProgress = progress;
                onProgress(progress, written, totalDownloadBytes, 'coreml');
              }
            },
            { fileCache: false },
          );
        } catch {
          if (this.cancelRequested) throw new Error('cancelled');
          throw new Error('Core ML encoder download failed');
        }

        const storedZipAbsPath = blobResponseStoragePath(zipRes, zipPath);

        this.activeTask = null;
        this.activeDownloadSettlement = null;
        this.setSnapshot({ jobId: null });

        if (zipRes.info().status === 200) {
          const zipForUnzip = await resolveCoreMlZipPathForUnzip(zipRes, zipPath);
          const zipSize = await waitForCoreMlZipMinSize(zipForUnzip, 2048, 15000);
          if (zipSize < 2048) {
            const layers = await coreMlZipFileSizeByLayer(zipForUnzip);
            throw new Error(
              `Core ML zip too small (${zipSize} bytes; nitro=${layers.nitro} blob=${layers.blob}; progress=${latestZip}/${zipTotal}); response may be HTML or truncated`,
            );
          }
          await unzip(zipForUnzip, pathForNativeUnzip(modelsDir));
          await NitroFS.unlink(zipForUnzip).catch(() => {});
          await RNBlobUtil.fs.unlink(zipForUnzip).catch(() => {});
          if (zipForUnzip !== pathForNativeUnzip(zipPath)) {
            await NitroFS.unlink(pathForNativeUnzip(zipPath)).catch(() => {});
            await RNBlobUtil.fs.unlink(pathForNativeUnzip(zipPath)).catch(() => {});
          }
        } else {
          await NitroFS.unlink(pathForNativeUnzip(storedZipAbsPath)).catch(() => {});
          await NitroFS.unlink(pathForNativeUnzip(zipPath)).catch(() => {});
          await RNBlobUtil.fs.unlink(pathForNativeUnzip(storedZipAbsPath)).catch(() => {});
          await RNBlobUtil.fs.unlink(pathForNativeUnzip(zipPath)).catch(() => {});
          devWarn(
            `[whisper-download] Core ML encoder failed (${zipRes.info().status}), using CPU`,
          );
        }
      } catch (e) {
        await NitroFS.unlink(pathForNativeUnzip(zipPath)).catch(() => {});
        await RNBlobUtil.fs.unlink(pathForNativeUnzip(zipPath)).catch(() => {});
        diagWarn('[whisper-download] coreml setup failed, using CPU', e);
      }
    } else if (IS_IOS) {
      devWarn('[whisper-download] Core ML encoder already installed, skipping', { modelId });
    }

    if (this.cancelRequested) throw new Error('cancelled');
    onProgress(100, totalDownloadBytes, totalDownloadBytes, 'weights');
    devWarn('[whisper-download] completed', { modelId, format, sessionId });
    this.setSnapshot({ machineState: 'completed', phase: null, jobId: null });
    this.resetSnapshot();
  }

  private async executeDownload(options: StartWhisperModelDownloadOptions): Promise<void> {
    try {
      await this.runDownloadPipeline(options);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const msg = error.message.toLowerCase();
      const isCancel =
        error.message === 'cancelled' || msg.includes('cancel') || this.cancelRequested;

      if (isCancel) {
        this.setSnapshot({ machineState: 'cancelled', lastError: null });
        await this.deletePartialArtifacts(options.modelId, {
          sessionId: this.activeSessionId ?? undefined,
        }).catch(() => {});
        this.resetSnapshot();
        throw new Error('cancelled');
      }

      this.setSnapshot({ machineState: 'failed', lastError: error });
      await this.deletePartialArtifacts(options.modelId, {
        sessionId: this.activeSessionId ?? undefined,
      }).catch(() => {});
      this.resetSnapshot();
      throw error;
    }
  }

  startDownload = async (options: StartWhisperModelDownloadOptions): Promise<void> => {
    const format = options.format ?? 'q5_1';

    if (this.cancelInFlight) {
      devWarn('[whisper-download] waiting for in-flight cancel before restart');
      await this.cancelInFlight.catch(() => {});
    }

    if (this.runPromise) {
      if (this.cancelRequested) {
        await Promise.race([
          this.runPromise.catch(() => {}),
          new Promise<void>((resolve) => setTimeout(resolve, 1800)),
        ]);
      }

      if (this.runPromise) {
        if (this.cancelRequested) {
          throw new Error('Whisper download is still cancelling. Please retry in a moment.');
        }
        if (this.snapshot.modelId === options.modelId && this.snapshot.format === format) {
          return this.runPromise;
        }
        throw new Error('Another Whisper model download is already in progress');
      }
    }

    this.runPromise = this.executeDownload(options).finally(() => {
      this.runPromise = null;
      this.activeTask = null;
      this.activeDownloadSettlement = null;
      this.activeSessionId = null;
    });

    return this.runPromise;
  };

  cancelWhisperModelDownload = async (modelId: WhisperModelId): Promise<void> => {
    if (this.cancelInFlight) return this.cancelInFlight;

    this.cancelInFlight = (async () => {
      if (this.snapshot.modelId !== modelId) {
        await this.deletePartialArtifacts(modelId, { force: true });
        return;
      }

      const cancelSessionId = this.activeSessionId;
      this.cancelRequested = true;
      devWarn('[whisper-download] cancel requested', {
        modelId,
        jobId: this.snapshot.jobId,
        sessionId: cancelSessionId,
      });

      const beforePath = getWhisperModelPath(modelId, this.snapshot.format ?? 'q5_1');

      try {
        await this.activeTask?.cancel?.();
      } catch {
        // best effort; verify and cleanup below
      }

      await this.awaitActiveDownloadSettledWithTimeout(1800);
      await this.verifyPartialFileNotGrowing(beforePath);
      await this.deletePartialArtifacts(modelId, {
        sessionId: cancelSessionId ?? undefined,
      });
      this.setSnapshot({ machineState: 'cancelled', jobId: null, phase: null });
      this.resetSnapshot();
    })().finally(() => {
      this.cancelInFlight = null;
    });

    return this.cancelInFlight;
  };
}

export const whisperModelDownloader = new WhisperModelDownloader();

export const cancelWhisperModelDownload = (modelId: WhisperModelId): Promise<void> =>
  whisperModelDownloader.cancelWhisperModelDownload(modelId);
