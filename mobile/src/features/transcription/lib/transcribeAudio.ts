import type { WhisperContext } from 'whisper.rn';

import type { TranscriptSegment } from '@/entities/record';

const formatTimestamp = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 100);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

type TranscribeAudioOptions = {
  context: WhisperContext;
  audioPath: string;
  language?: string;
  onProgress?: (progress: number) => void;
};

type TranscribeAudioResult = {
  segments: TranscriptSegment[];
  fullText: string;
  stop: () => Promise<void>;
  promise: Promise<{ segments: TranscriptSegment[]; fullText: string }>;
};

export const transcribeAudio = (options: TranscribeAudioOptions): TranscribeAudioResult => {
  const { context, audioPath, language = 'auto', onProgress } = options;

  const { stop, promise: rawPromise } = context.transcribe(audioPath, {
    language,
    onProgress,
  });

  const promise = rawPromise.then((result) => {
    const segments: TranscriptSegment[] = result.segments.map((seg, index) => ({
      id: String(index),
      startTime: formatTimestamp(seg.t0),
      text: seg.text.trim(),
    }));

    const fullText = result.result.trim();
    return { segments, fullText };
  });

  return { segments: [], fullText: '', stop, promise };
};
