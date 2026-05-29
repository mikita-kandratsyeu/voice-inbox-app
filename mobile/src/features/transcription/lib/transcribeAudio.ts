import { AppState } from 'react-native';
import type { WhisperContext } from 'whisper.rn';

import type { TranscriptSegment, WordToken } from '@/entities/record';
import type { AudioChunk } from '@/shared/lib/audio';
import { splitAudioIntoChunks } from '@/shared/lib/audio';
import { isArray, isRecord, isString } from '@/shared/lib/type-guards';

import { canRunWhisperGpuWork } from './whisperAppState';
import { beginWhisperNativeWork, endWhisperNativeWork } from './whisperNativeLifecycle';

const MIN_DURATION_MS = 500;

const CHUNK_THRESHOLD_MS = 30_000;

const CHUNK_DURATION_SEC = 24;
const CHUNK_OVERLAP_SEC = 3;

const PROMPT_TAIL_LENGTH = 200;

export type TranscribeAudioOptions = {
  context: WhisperContext;
  audioPath: string;
  durationMs: number;
  language?: string;
  onProgress?: (current: number, total: number) => void;
  resume?: {
    startChunkIndex: number;
    fullText: string;
    segments: TranscriptSegment[];
  };
  onChunkCompleted?: (payload: {
    chunkIndex: number;
    totalChunks: number;
    fullText: string;
    segments: TranscriptSegment[];
  }) => void;
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

type WhisperToken = { text: string; t0: number; t1: number };
type WhisperSegment = { text: string; t0: number; t1: number; tokens?: WhisperToken[] };
type WhisperTranscribeResult = { result: string; segments: WhisperSegment[] };

const normalizeResult = (raw: unknown): WhisperTranscribeResult => {
  if (raw && isRecord(raw) && 'result' in raw && 'segments' in raw) {
    const r = raw as WhisperTranscribeResult;
    return {
      result: isString(r.result) ? r.result : '',
      segments: isArray(r.segments) ? r.segments : [],
    };
  }
  return { result: '', segments: [] };
};

const CENTISECONDS_TO_MS = 10;

const mapTokens = (
  tokens: WhisperToken[] | undefined,
  chunkOffsetMs = 0,
): WordToken[] | undefined => {
  if (!tokens || tokens.length === 0) return undefined;
  return tokens
    .filter((tok) => tok.text && !tok.text.startsWith('['))
    .map((tok) => ({
      text: tok.text,
      startMs: Number(tok.t0) * CENTISECONDS_TO_MS + chunkOffsetMs,
      endMs: Number(tok.t1) * CENTISECONDS_TO_MS + chunkOffsetMs,
    }));
};

const mapSegments = (
  result: WhisperTranscribeResult,
  offset: number = 0,
  chunkOffsetMs = 0,
): TranscriptSegment[] =>
  (result.segments || []).map((seg, idx) => ({
    id: String(offset + idx),
    startTime: formatTimestamp(Number(seg?.t0) || 0),
    startMs: Number(seg?.t0 ?? 0) * CENTISECONDS_TO_MS + chunkOffsetMs,
    endMs: Number(seg?.t1 ?? 0) * CENTISECONDS_TO_MS + chunkOffsetMs,
    text: (seg?.text ?? '').trim(),
    tokens: mapTokens(seg?.tokens, chunkOffsetMs),
  }));

const resolveChunkTimestampOffsetMs = (
  result: WhisperTranscribeResult,
  chunkOffsetMs: number,
): number => {
  if (chunkOffsetMs <= 0) return 0;
  if (!result.segments || result.segments.length === 0) return chunkOffsetMs;

  const segmentStartMs = result.segments
    .map((seg) => Number(seg?.t0 ?? 0) * CENTISECONDS_TO_MS)
    .filter((value) => Number.isFinite(value));

  if (segmentStartMs.length === 0) return chunkOffsetMs;

  const minStartMs = Math.min(...segmentStartMs);
  const ABSOLUTE_TS_TOLERANCE_MS = 1500;

  return minStartMs >= chunkOffsetMs - ABSOLUTE_TS_TOLERANCE_MS ? 0 : chunkOffsetMs;
};

export const transcribeAudio = (options: TranscribeAudioOptions): TranscribeAudioHandle => {
  const {
    context,
    audioPath,
    durationMs,
    language = 'auto',
    onProgress,
    resume,
    onChunkCompleted,
  } = options;

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
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        cancelled = true;
        void stop();
      }
    });
    try {
      // Let the caller register `stop` before native whisper_full starts.
      await Promise.resolve();

      if (cancelled || !canRunWhisperGpuWork()) {
        throw new Error('abort');
      }

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
        resume,
        onChunkCompleted,
        cancelled: () => cancelled,
        setStop: (fn) => {
          activeStop = fn;
        },
      });
    } finally {
      appStateSub.remove();
    }
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
  if (cancelled() || !canRunWhisperGpuWork()) {
    throw new Error('abort');
  }

  beginWhisperNativeWork();
  try {
    const { stop, promise: rawPromise } = context.transcribe(audioPath, { language });

    setStop(stop);

    if (cancelled()) {
      await stop();
      throw new Error('abort');
    }

    let raw: unknown;
    try {
      raw = await rawPromise;
    } catch (err) {
      if (cancelled() || !canRunWhisperGpuWork()) {
        throw new Error('abort');
      }
      throw err;
    }
    setStop(async () => {});

    if (cancelled()) {
      throw new Error('abort');
    }

    const result = normalizeResult(raw);
    return {
      segments: mapSegments(result, 0, 0),
      fullText: (result.result ?? '').trim(),
    };
  } finally {
    endWhisperNativeWork();
  }
};

type LongOptions = {
  context: WhisperContext;
  audioPath: string;
  language: string;
  totalDurationSec: number;
  onProgress?: (current: number, total: number) => void;
  resume?: {
    startChunkIndex: number;
    fullText: string;
    segments: TranscriptSegment[];
  };
  onChunkCompleted?: (payload: {
    chunkIndex: number;
    totalChunks: number;
    fullText: string;
    segments: TranscriptSegment[];
  }) => void;
  cancelled: () => boolean;
  setStop: (fn: () => Promise<void>) => void;
};

const transcribeLong = async ({
  context,
  audioPath,
  language,
  totalDurationSec,
  onProgress,
  resume,
  onChunkCompleted,
  cancelled,
  setStop,
}: LongOptions): Promise<TranscribeAudioResult> => {
  const chunks: AudioChunk[] = splitAudioIntoChunks(
    totalDurationSec,
    CHUNK_DURATION_SEC,
    CHUNK_OVERLAP_SEC,
  );

  const total = chunks.length;
  const startChunkIndex = Math.max(0, Math.min(resume?.startChunkIndex ?? 0, total));
  const allSegments: TranscriptSegment[] = [...(resume?.segments ?? [])];
  let fullText = (resume?.fullText ?? '').trim();
  let segmentOffset = allSegments.length;

  if (startChunkIndex > 0) {
    onProgress?.(startChunkIndex, total);
  }

  for (let i = startChunkIndex; i < chunks.length; i++) {
    if (cancelled() || !canRunWhisperGpuWork()) {
      throw new Error('abort');
    }

    const chunk = chunks[i];

    const prompt = fullText.length > 0 ? fullText.slice(-PROMPT_TAIL_LENGTH) : undefined;

    if (!canRunWhisperGpuWork()) {
      throw new Error('abort');
    }

    beginWhisperNativeWork();
    let raw: unknown;
    try {
      const { stop: chunkStop, promise: rawPromise } = context.transcribe(audioPath, {
        language,
        prompt,
        offset: chunk.offsetMs,
        duration: chunk.durationMs,
      });

      setStop(chunkStop);

      try {
        raw = await rawPromise;
      } catch (chunkErr) {
        if (cancelled() || !canRunWhisperGpuWork()) {
          throw new Error('abort');
        }
        throw chunkErr;
      }
      setStop(async () => {});

      if (cancelled()) {
        throw new Error('abort');
      }
    } finally {
      endWhisperNativeWork();
    }

    const result = normalizeResult(raw);
    const timestampOffsetMs = resolveChunkTimestampOffsetMs(result, chunk.offsetMs);
    const chunkSegments = mapSegments(result, segmentOffset, timestampOffsetMs);
    allSegments.push(...chunkSegments);
    segmentOffset += chunkSegments.length;

    const chunkText = (result.result ?? '').trim();
    fullText = fullText.length > 0 ? `${fullText} ${chunkText}` : chunkText;

    onProgress?.(i + 1, total);
    onChunkCompleted?.({
      chunkIndex: i,
      totalChunks: total,
      fullText,
      segments: allSegments,
    });

    await new Promise<void>((resolve) => setTimeout(resolve, 200));
  }

  return { segments: allSegments, fullText };
};
