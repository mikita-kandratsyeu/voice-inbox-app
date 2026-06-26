import type { WhisperModelId } from '@/entities/settings';

export type WhisperKitDownloadMachineState = 'idle' | 'pending' | 'downloading';

export type WhisperKitDownloadProgressHandler = (
  progress: number,
  bytesWritten: number,
  contentLength: number,
) => void;

export type WhisperKitDownloadSnapshot = {
  machineState: WhisperKitDownloadMachineState;
  modelId: WhisperModelId | null;
  jobId: string | null;
  lastError: string | null;
};

export type StartWhisperKitModelDownloadOptions = {
  modelId: WhisperModelId;
  whisperKitModel: string;
  modelCachePath: string;
  expectedBytes: number;
  onProgress: WhisperKitDownloadProgressHandler;
};
