import type { LocalAiModelId } from '@/entities/settings';

export type LocalLlmDownloadMachineState =
  | 'idle'
  | 'pending'
  | 'downloading'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type LocalLlmDownloadSnapshot = {
  machineState: LocalLlmDownloadMachineState;
  modelId: LocalAiModelId | null;
  jobId: number | null;
  lastError: Error | null;
};

export type LocalLlmDownloadProgressHandler = (
  progress: number,
  bytesWritten: number,
  contentLength: number,
) => void;

export type StartLocalLlmDownloadOptions = {
  modelId: LocalAiModelId;
  expectedBytes: number;
  onProgress: LocalLlmDownloadProgressHandler;
};
