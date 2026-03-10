import type { WhisperContext } from 'whisper.rn';

import type { TranscriptSegment } from '@/entities/record';
import type { AudioChunk } from '@/shared/lib/audio';
import { splitAudioIntoChunks } from '@/shared/lib/audio';

const MIN_DURATION_MS = 500;

const CHUNK_THRESHOLD_MS = 30_000;

const CHUNK_DURATION_SEC = 27;
const CHUNK_OVERLAP_SEC = 3;

const PROMPT_TAIL_LENGTH = 200;

export type TranscribeAudioOptions = {
  context: WhisperContext;
  audioPath: string;
  durationMs: number;
  language?: string;
  onProgress?: (current: number, total: number) => void;
};

export type TranscribeAudioResult = {
  segments: TranscriptSegment[];
  fullText: string;
  skipped?: boolean;
};

type TranscribeAudioHandle = {
  promise: Promise<TranscribeAudioResult>;
  stop: () => Promise<void>;
};

const formatTimestamp = (centiseconds: number): string => {
  const totalSeconds = Math.floor(centiseconds / 100);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

type WhisperSegment = { text: string; t0: number; t1: number };
type WhisperTranscribeResult = { result: string; segments: WhisperSegment[] };

const mapSegments = (result: WhisperTranscribeResult, offset: number = 0): TranscriptSegment[] =>
  result.segments.map((seg, idx) => ({
    id: String(offset + idx),
    startTime: formatTimestamp(seg.t0),
    text: seg.text.trim(),
  }));

export const transcribeAudio = (options: TranscribeAudioOptions): TranscribeAudioHandle => {
  const { context, audioPath, durationMs, language = 'auto', onProgress } = options;

  let cancelled = false;
  let activeStop: (() => Promise<void>) | null = null;

  const stop = async (): Promise<void> => {
    cancelled = true;
    if (activeStop) {
      await activeStop();
      activeStop = null;
    }
  };

  const promise = (async (): Promise<TranscribeAudioResult> => {
    if (durationMs < MIN_DURATION_MS) {
      return { segments: [], fullText: '', skipped: true };
    }

    if (durationMs < CHUNK_THRESHOLD_MS) {
      return transcribeShort({
        context,
        audioPath,
        language,
        cancelled: () => cancelled,
        setStop: (fn) => {
          activeStop = fn;
        },
      });
    }

    return transcribeLong({
      context,
      audioPath,
      language,
      totalDurationSec: durationMs / 1000,
      onProgress,
      cancelled: () => cancelled,
      setStop: (fn) => {
        activeStop = fn;
      },
    });
  })();

  return { promise, stop };
};

type ShortOptions = {
  context: WhisperContext;
  audioPath: string;
  language: string;
  cancelled: () => boolean;
  setStop: (fn: () => Promise<void>) => void;
};

const transcribeShort = async ({
  context,
  audioPath,
  language,
  cancelled,
  setStop,
}: ShortOptions): Promise<TranscribeAudioResult> => {
  const { stop, promise: rawPromise } = context.transcribe(audioPath, { language });

  setStop(stop);

  if (cancelled()) {
    await stop();
    throw new Error('abort');
  }

  let result: WhisperTranscribeResult;
  try {
    result = await rawPromise;
  } catch (err) {
    if (cancelled()) {
      throw new Error('abort');
    }
    throw err;
  }
  setStop(async () => {});

  if (cancelled()) {
    throw new Error('abort');
  }

  return {
    segments: mapSegments(result),
    fullText: result.result.trim(),
  };
};

type LongOptions = {
  context: WhisperContext;
  audioPath: string;
  language: string;
  totalDurationSec: number;
  onProgress?: (current: number, total: number) => void;
  cancelled: () => boolean;
  setStop: (fn: () => Promise<void>) => void;
};

const transcribeLong = async ({
  context,
  audioPath,
  language,
  totalDurationSec,
  onProgress,
  cancelled,
  setStop,
}: LongOptions): Promise<TranscribeAudioResult> => {
  const chunks: AudioChunk[] = splitAudioIntoChunks(
    totalDurationSec,
    CHUNK_DURATION_SEC,
    CHUNK_OVERLAP_SEC,
  );

  const total = chunks.length;
  const allSegments: TranscriptSegment[] = [];
  let fullText = '';
  let segmentOffset = 0;

  for (let i = 0; i < chunks.length; i++) {
    if (cancelled()) {
      throw new Error('abort');
    }

    const chunk = chunks[i];

    const prompt = fullText.length > 0 ? fullText.slice(-PROMPT_TAIL_LENGTH) : undefined;

    const { stop: chunkStop, promise: rawPromise } = context.transcribe(audioPath, {
      language,
      prompt,
      offset: chunk.offsetMs,
      duration: chunk.durationMs,
    });

    setStop(chunkStop);

    let result: WhisperTranscribeResult;
    try {
      result = await rawPromise;
    } catch (chunkErr) {
      if (cancelled()) {
        throw new Error('abort');
      }
      throw chunkErr;
    }
    setStop(async () => {});

    if (cancelled()) {
      throw new Error('abort');
    }

    const chunkSegments = mapSegments(result, segmentOffset);
    allSegments.push(...chunkSegments);
    segmentOffset += chunkSegments.length;

    const chunkText = result.result.trim();
    fullText = fullText.length > 0 ? `${fullText} ${chunkText}` : chunkText;

    onProgress?.(i + 1, total);
  }

  return { segments: allSegments, fullText };
};
