import type { TranscriptSegment } from '@/entities/record';

export type ImportAudioPhase = 'copying' | 'converting' | 'analyzing' | 'reading';

export type PendingSubtitleImport = {
  transcript: string;
  transcriptSegments: TranscriptSegment[];
  durationMs: number;
  defaultTitle: string;
};
