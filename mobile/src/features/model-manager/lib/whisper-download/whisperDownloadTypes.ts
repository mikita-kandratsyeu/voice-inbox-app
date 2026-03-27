import type {
  WhisperDownloadPhase,
  WhisperModelId,
  WhisperModelWeightsFormat,
} from '@/entities/settings';

export type WhisperDownloadMachineState =
  | 'idle'
  | 'pending'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type WhisperDownloadSnapshot = {
  machineState: WhisperDownloadMachineState;
  modelId: WhisperModelId | null;
  format: WhisperModelWeightsFormat | null;
  phase: WhisperDownloadPhase | null;
  jobId: number | null;
  lastError: Error | null;
};

export type WhisperDownloadProgressHandler = (
  progress: number,
  bytesWritten: number,
  contentLength: number,
  phase: WhisperDownloadPhase,
) => void;

export type StartWhisperModelDownloadOptions = {
  modelId: WhisperModelId;
  format?: WhisperModelWeightsFormat;
  expectedBytes: number;
  onProgress: WhisperDownloadProgressHandler;
};
