import type { TranscriptSegment } from '@/entities/record';

export type TranscriptionOptions = {
  language?: 'auto' | string;
  model?: 'base' | 'small' | 'medium';
  diarization?: boolean;
  maxSpeakers?: number;
};

export type Speaker = {
  id: string;
  label: string;
};

export type TranscriptionEngineSegment = {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  speakerId?: string;
  language?: string;
  isOverlapping?: boolean;
  tokens?: Array<{ text: string; startMs: number; endMs: number }>;
};

export type TranscriptionResult = {
  jobId: string;
  detectedLanguage?: string;
  durationMs: number;
  speakers: Speaker[];
  segments: TranscriptionEngineSegment[];
  fullText: string;
  skipped?: boolean;
};

export type TranscriptionProgressPhase =
  | 'modelLoading'
  | 'normalizing'
  | 'diarizing'
  | 'transcribingChunk'
  | 'merging'
  | 'checkpointSaved';

export type TranscriptionProgressEvent = {
  jobId: string;
  phase: TranscriptionProgressPhase;
  currentChunk?: number;
  totalChunks?: number;
  progress: number;
  label?: string;
  partialSegments?: TranscriptSegment[];
};

export type TranscriptionChunkProfile = {
  chunkDurationSec: number;
  chunkOverlapSec: number;
};
