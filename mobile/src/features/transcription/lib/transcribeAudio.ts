import { AppState } from 'react-native';
import type { WhisperContext } from 'whisper.rn';

import type { TranscriptSegment, WordToken } from '@/entities/record';
import type { AudioChunk } from '@/shared/lib/audio';
import { createWavChunk, splitAudioIntoChunks } from '@/shared/lib/audio';
import { NitroFS } from '@/shared/lib/fs';
import { isArray, isRecord, isString } from '@/shared/lib/type-guards';

import { TranscriptionError } from './transcriptionErrors';
import { canRunWhisperGpuWork } from './whisperAppState';
import { beginWhisperNativeWork, endWhisperNativeWork } from './whisperNativeLifecycle';

const MIN_DURATION_MS = 500;

const CHUNK_THRESHOLD_MS = 30_000;

export type TranscriptionChunkProfile = {
  chunkDurationSec: number;
  chunkOverlapSec: number;
};

const DEFAULT_CHUNK_PROFILE: TranscriptionChunkProfile = {
  chunkDurationSec: 24,
  chunkOverlapSec: 3,
};

const PROMPT_TAIL_LENGTH = 200;

export type TranscribeAudioOptions = {
  context: WhisperContext;
  recycleContext?: () => Promise<WhisperContext>;
  audioPath: string;
  durationMs: number;
  language?: string;
  chunkProfile?: TranscriptionChunkProfile;
  contextRecycleChunks?: number;
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

const getLatestSegmentEndMs = (segments: TranscriptSegment[]): number | null => {
  let latest: number | null = null;
  for (const segment of segments) {
    if (typeof segment.endMs !== 'number') continue;
    latest = latest == null ? segment.endMs : Math.max(latest, segment.endMs);
  }
  return latest;
};

const appendText = (existing: string, next: string): string => {
  const trimmed = next.trim();
  if (trimmed.length === 0) return existing;
  return existing.length > 0 ? `${existing} ${trimmed}` : trimmed;
};

const removeFullyOverlappedSegments = (
  segments: TranscriptSegment[],
  previousEndMs: number | null,
): TranscriptSegment[] => {
  if (previousEndMs == null) return segments;

  return segments
    .filter((segment) => segment.endMs == null || segment.endMs > previousEndMs)
    .map((segment) => {
      const tokens = segment.tokens?.filter((token) => token.endMs > previousEndMs);
      return {
        ...segment,
        ...(tokens ? { tokens } : {}),
      };
    });
};

export const transcribeAudio = (options: TranscribeAudioOptions): TranscribeAudioHandle => {
  const {
    context,
    recycleContext,
    audioPath,
    durationMs,
    language = 'auto',
    chunkProfile = DEFAULT_CHUNK_PROFILE,
    contextRecycleChunks = 12,
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
        throw new TranscriptionError('native_abort');
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

      let currentContext = context;
      return transcribeLong({
        getContext: () => currentContext,
        recycleContext: recycleContext
          ? async () => {
              currentContext = await recycleContext();
            }
          : undefined,
        audioPath,
        language,
        totalDurationSec: durationMs / 1000,
        chunkProfile,
        contextRecycleChunks,
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
    throw new TranscriptionError('native_abort');
  }

  beginWhisperNativeWork();
  try {
    const { stop, promise: rawPromise } = context.transcribe(audioPath, { language });

    setStop(stop);

    if (cancelled()) {
      await stop();
      throw new TranscriptionError('native_abort');
    }

    let raw: unknown;
    try {
      raw = await rawPromise;
    } catch (err) {
      if (cancelled() || !canRunWhisperGpuWork()) {
        throw new TranscriptionError('native_abort');
      }
      throw err;
    }
    setStop(async () => {});

    if (cancelled()) {
      throw new TranscriptionError('native_abort');
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
  getContext: () => WhisperContext;
  recycleContext?: () => Promise<void>;
  audioPath: string;
  language: string;
  totalDurationSec: number;
  chunkProfile: TranscriptionChunkProfile;
  contextRecycleChunks: number;
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
  getContext,
  recycleContext,
  audioPath,
  language,
  totalDurationSec,
  chunkProfile,
  contextRecycleChunks,
  onProgress,
  resume,
  onChunkCompleted,
  cancelled,
  setStop,
}: LongOptions): Promise<TranscribeAudioResult> => {
  const chunks: AudioChunk[] = splitAudioIntoChunks(
    totalDurationSec,
    chunkProfile.chunkDurationSec,
    chunkProfile.chunkOverlapSec,
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
      throw new TranscriptionError('native_abort');
    }

    const chunk = chunks[i];

    const prompt = fullText.length > 0 ? fullText.slice(-PROMPT_TAIL_LENGTH) : undefined;

    if (!canRunWhisperGpuWork()) {
      throw new TranscriptionError('native_abort');
    }

    beginWhisperNativeWork();
    let raw: unknown;
    const chunkAudioPath = `${audioPath}.chunk-${chunk.index}.wav`;
    try {
      const chunkPath = await createWavChunk(
        audioPath,
        chunkAudioPath,
        chunk.offsetMs,
        chunk.durationMs,
      );
      if (!chunkPath) {
        throw new Error('wav_chunk_create_failed');
      }
      if (cancelled() || !canRunWhisperGpuWork()) {
        throw new TranscriptionError('native_abort');
      }

      const { stop: chunkStop, promise: rawPromise } = getContext().transcribe(chunkPath, {
        language,
        prompt,
      });

      setStop(chunkStop);

      try {
        raw = await rawPromise;
      } catch (chunkErr) {
        if (cancelled() || !canRunWhisperGpuWork()) {
          throw new TranscriptionError('native_abort');
        }
        throw chunkErr;
      }
      setStop(async () => {});

      if (cancelled()) {
        throw new TranscriptionError('native_abort');
      }
    } finally {
      endWhisperNativeWork();
      void NitroFS.unlink(chunkAudioPath).catch(() => {});
    }

    const result = normalizeResult(raw);
    const timestampOffsetMs = chunk.offsetMs;
    const previousEndMs = getLatestSegmentEndMs(allSegments);
    const chunkSegments = removeFullyOverlappedSegments(
      mapSegments(result, 0, timestampOffsetMs),
      previousEndMs,
    ).map((segment, idx) => ({
      ...segment,
      id: String(segmentOffset + idx),
    }));
    allSegments.push(...chunkSegments);
    segmentOffset += chunkSegments.length;

    const acceptedSegmentText = chunkSegments
      .map((segment) => segment.text)
      .filter((text) => text.length > 0)
      .join(' ');
    const fallbackText = result.segments.length === 0 ? result.result : '';
    fullText = appendText(fullText, acceptedSegmentText || fallbackText);

    onChunkCompleted?.({
      chunkIndex: i,
      totalChunks: total,
      fullText,
      segments: allSegments,
    });
    onProgress?.(i + 1, total);

    if (
      recycleContext &&
      i + 1 < chunks.length &&
      (i + 1 - startChunkIndex) % contextRecycleChunks === 0
    ) {
      await recycleContext();
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 200));
  }

  return { segments: allSegments, fullText };
};
