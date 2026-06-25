import { AppState } from 'react-native';
import type { TranscribeFileOptions, WhisperContext } from 'whisper.rn';

import type { TranscriptSegment, WordToken } from '@/entities/record';
import { diagWarn } from '@/shared/lib/appLogger';
import type { AudioChunk } from '@/shared/lib/audio';
import { createWavChunk, splitAudioIntoChunks } from '@/shared/lib/audio';
import { NitroFS } from '@/shared/lib/fs';
import { isArray, isRecord, isString } from '@/shared/lib/type-guards';

import {
  MIN_TRANSCRIBE_MS,
  PROMPT_TAIL_LENGTH,
  SUSPICIOUS_VAD_TRIM_RATIO,
  TRANSCRIPTION_VAD_ENABLED,
  VAD_RISKY_MIDDLE_SPEECH_RATIO,
  VAD_TRIM_PADDING_MS,
} from '../config/constants';
import { analyzeWavSpeech } from './audioVad';
import { buildWhisperPrompt } from './buildWhisperPrompt';
import { dedupeChunkTextOverlap } from './chunkTextDedup';
import { collapseRepeatedTokenStutters, isUsableTranscriptText } from './cleanTranscriptText';
import { TranscriptionError } from './transcriptionErrors';
import { TranscriptionRuntimeBenchmark } from './transcriptionRuntimeBenchmark';
import type { TranscriptionVadPolicy } from './transcriptionQualityMode';
import { canRunWhisperGpuWork } from './whisperAppState';
import { beginWhisperNativeWork, endWhisperNativeWork } from './whisperNativeLifecycle';

const CHUNK_THRESHOLD_MS = 30_000;
const MIN_VAD_TRIM_SOURCE_MS = 10_000;

export type TranscriptionChunkProfile = {
  chunkDurationSec: number;
  chunkOverlapSec: number;
};

const DEFAULT_CHUNK_PROFILE: TranscriptionChunkProfile = {
  chunkDurationSec: 45,
  chunkOverlapSec: 4,
};

const BASE_TRANSCRIBE_OPTIONS: Pick<
  TranscribeFileOptions,
  'maxLen' | 'temperature' | 'temperatureInc'
> = {
  maxLen: 80,
  temperature: 0,
  temperatureInc: 0,
};

export type TranscribeAudioOptions = {
  context: WhisperContext;
  recycleContext?: () => Promise<WhisperContext>;
  audioPath: string;
  durationMs: number;
  language?: string;
  customWords?: string[];
  vadEnabled?: boolean;
  vadPolicy?: TranscriptionVadPolicy;
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
    chunkProfile: TranscriptionChunkProfile;
    avgSecondsPerChunk?: number;
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

const getPromptTail = (text: string): string | undefined => {
  const tail = text.trim().slice(-PROMPT_TAIL_LENGTH).trim();
  return isUsableTranscriptText(tail) ? tail : undefined;
};

const buildChunkPrompt = (fullText: string, customWords: readonly string[]): string | undefined => {
  const vocabulary = buildWhisperPrompt('', customWords);
  const tail = getPromptTail(fullText);
  if (vocabulary && tail) {
    return `${vocabulary} ${tail}`.trim();
  }
  if (vocabulary) return vocabulary;
  return tail;
};

const finalizeTranscriptText = (text: string): string => collapseRepeatedTokenStutters(text.trim());

type ResolvedTranscriptionPath = {
  path: string;
  timestampOffsetMs: number;
  skipped: boolean;
};

const extractDetectedLanguage = (raw: unknown): string | undefined => {
  if (!raw || !isRecord(raw)) return undefined;
  const language = raw.language;
  return isString(language) && language.length > 0 && language !== 'auto' ? language : undefined;
};

const applyVadPadding = (
  trimStartMs: number,
  trimDurationMs: number,
  sourceDurationMs: number,
): { trimStartMs: number; trimDurationMs: number } => {
  const paddedStartMs = Math.max(0, trimStartMs - VAD_TRIM_PADDING_MS);
  const paddedEndMs = Math.min(
    sourceDurationMs,
    trimStartMs + trimDurationMs + VAD_TRIM_PADDING_MS,
  );
  return {
    trimStartMs: paddedStartMs,
    trimDurationMs: Math.max(0, paddedEndMs - paddedStartMs),
  };
};

const isRiskyMiddleSpeechTrim = (
  trimStartMs: number,
  trimDurationMs: number,
  sourceDurationMs: number,
): boolean => {
  if (sourceDurationMs <= 0) return false;
  const trimEndMs = trimStartMs + trimDurationMs;
  const leadingSilenceRatio = trimStartMs / sourceDurationMs;
  const trailingSilenceRatio = (sourceDurationMs - trimEndMs) / sourceDurationMs;
  return (
    leadingSilenceRatio >= VAD_RISKY_MIDDLE_SPEECH_RATIO &&
    trailingSilenceRatio >= VAD_RISKY_MIDDLE_SPEECH_RATIO
  );
};

const resolveTranscriptionPath = async (
  sourcePath: string,
  vadEnabled: boolean,
  sourceDurationMs: number,
  vadPolicy: TranscriptionVadPolicy = 'skipSilentOnly',
): Promise<ResolvedTranscriptionPath> => {
  if (!vadEnabled || !TRANSCRIPTION_VAD_ENABLED) {
    return { path: sourcePath, timestampOffsetMs: 0, skipped: false };
  }

  const analysis = await analyzeWavSpeech(sourcePath);
  if (!analysis) {
    return { path: sourcePath, timestampOffsetMs: 0, skipped: false };
  }

  if (!analysis.hasSpeech) {
    return { path: sourcePath, timestampOffsetMs: 0, skipped: true };
  }

  if (vadPolicy === 'skipSilentOnly') {
    return { path: sourcePath, timestampOffsetMs: 0, skipped: false };
  }

  let trimStartMs = analysis.trimStartMs;
  let trimDurationMs = analysis.trimDurationMs;
  const padded = applyVadPadding(trimStartMs, trimDurationMs, sourceDurationMs);
  trimStartMs = padded.trimStartMs;
  trimDurationMs = padded.trimDurationMs;

  if (
    sourceDurationMs >= MIN_VAD_TRIM_SOURCE_MS &&
    trimDurationMs > 0 &&
    trimDurationMs / sourceDurationMs < SUSPICIOUS_VAD_TRIM_RATIO
  ) {
    diagWarn('[transcription] suspicious VAD trim ignored', {
      sourceDurationMs,
      trimStartMs,
      trimDurationMs,
    });
    return { path: sourcePath, timestampOffsetMs: 0, skipped: false };
  }

  if (isRiskyMiddleSpeechTrim(trimStartMs, trimDurationMs, sourceDurationMs)) {
    diagWarn('[transcription] risky middle VAD trim ignored', {
      sourceDurationMs,
      trimStartMs,
      trimDurationMs,
    });
    return { path: sourcePath, timestampOffsetMs: 0, skipped: false };
  }

  if (trimDurationMs < MIN_TRANSCRIBE_MS) {
    return { path: sourcePath, timestampOffsetMs: 0, skipped: false };
  }

  const trimmedPath = `${sourcePath}.vad-trim.wav`;
  const trimmed = await createWavChunk(
    sourcePath,
    trimmedPath,
    trimStartMs,
    trimDurationMs,
  );
  if (!trimmed) {
    return { path: sourcePath, timestampOffsetMs: 0, skipped: false };
  }

  return {
    path: trimmed,
    timestampOffsetMs: trimStartMs,
    skipped: false,
  };
};

const normalizeTranscriptionResult = (raw: unknown): WhisperTranscribeResult => {
  const result = normalizeResult(raw);
  return {
    result: isUsableTranscriptText(result.result) ? result.result : '',
    segments: result.segments.filter((segment) => isUsableTranscriptText(segment.text ?? '')),
  };
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
  (result.segments || []).map((seg, idx) => {
    const startMs = Number(seg?.t0 ?? 0) * CENTISECONDS_TO_MS + chunkOffsetMs;
    const endMs = Number(seg?.t1 ?? 0) * CENTISECONDS_TO_MS + chunkOffsetMs;
    return {
      id: String(offset + idx),
      startTime: formatTimestamp(Math.floor(startMs / CENTISECONDS_TO_MS)),
      startMs,
      endMs,
      text: (seg?.text ?? '').trim(),
      tokens: mapTokens(seg?.tokens, chunkOffsetMs),
    };
  });

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

const trimOverlappedSegments = (
  segments: TranscriptSegment[],
  previousEndMs: number | null,
): TranscriptSegment[] => {
  if (previousEndMs == null) return segments;

  const trimmed: TranscriptSegment[] = [];
  for (const segment of segments) {
    if (segment.endMs != null && segment.endMs <= previousEndMs) {
      continue;
    }

    if (segment.tokens && segment.tokens.length > 0) {
      const tokens = segment.tokens.filter((token) => token.endMs > previousEndMs);
      if (tokens.length === 0) {
        continue;
      }

      const text = tokens
        .map((token) => token.text)
        .join('')
        .trim();
      trimmed.push({
        ...segment,
        startMs: tokens[0]?.startMs ?? segment.startMs,
        endMs: tokens[tokens.length - 1]?.endMs ?? segment.endMs,
        text: text.length > 0 ? text : segment.text,
        tokens,
      });
      continue;
    }

    if (segment.startMs != null && segment.startMs < previousEndMs) {
      if (segment.endMs == null || segment.endMs <= previousEndMs) {
        continue;
      }
    }

    trimmed.push(segment);
  }

  return trimmed;
};

const rebuildRemainingChunks = (
  chunks: AudioChunk[],
  fromIndex: number,
  totalDurationSec: number,
  profile: TranscriptionChunkProfile,
): AudioChunk[] => {
  const currentChunk = chunks[fromIndex];
  if (!currentChunk) return chunks;

  const processedEndSec =
    (currentChunk.offsetMs + currentChunk.durationMs) / 1000 - profile.chunkOverlapSec;
  const remainingDurationSec = Math.max(0, totalDurationSec - processedEndSec);
  if (remainingDurationSec <= profile.chunkOverlapSec) {
    return chunks.slice(0, fromIndex + 1);
  }

  const remainingChunks = splitAudioIntoChunks(
    remainingDurationSec,
    profile.chunkDurationSec,
    profile.chunkOverlapSec,
  ).map((chunk, offset) => ({
    ...chunk,
    offsetMs: chunk.offsetMs + Math.round(processedEndSec * 1000),
    index: fromIndex + 1 + offset,
  }));

  return [...chunks.slice(0, fromIndex + 1), ...remainingChunks];
};

export const transcribeAudio = (options: TranscribeAudioOptions): TranscribeAudioHandle => {
  const {
    context,
    recycleContext,
    audioPath,
    durationMs,
    language = 'auto',
    customWords = [],
    vadEnabled = TRANSCRIPTION_VAD_ENABLED,
    vadPolicy = 'skipSilentOnly',
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

      if (durationMs < MIN_TRANSCRIBE_MS) {
        return { segments: [], fullText: '', skipped: true };
      }

      if (durationMs < CHUNK_THRESHOLD_MS) {
        return transcribeShort({
          context,
          audioPath,
          durationMs,
          language,
          customWords,
          vadEnabled,
          vadPolicy,
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
        customWords,
        vadEnabled,
        vadPolicy,
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
  durationMs: number;
  language: string;
  customWords: string[];
  vadEnabled: boolean;
  vadPolicy: TranscriptionVadPolicy;
  cancelled: () => boolean;
  setStop: (fn: () => Promise<void>) => void;
};

const transcribeShort = async ({
  context,
  audioPath,
  durationMs,
  language,
  customWords,
  vadEnabled,
  vadPolicy,
  cancelled,
  setStop,
}: ShortOptions): Promise<TranscribeAudioResult> => {
  if (cancelled() || !canRunWhisperGpuWork()) {
    throw new TranscriptionError('native_abort');
  }

  const resolved = await resolveTranscriptionPath(
    audioPath,
    vadEnabled,
    durationMs,
    vadPolicy,
  );
  if (resolved.skipped) {
    return { segments: [], fullText: '', skipped: true };
  }

  beginWhisperNativeWork();
  try {
    const prompt = buildChunkPrompt('', customWords);
    const { stop, promise: rawPromise } = context.transcribe(resolved.path, {
      ...BASE_TRANSCRIBE_OPTIONS,
      language,
      ...(prompt ? { prompt } : {}),
    });

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

    const result = normalizeTranscriptionResult(raw);
    return {
      segments: mapSegments(result, 0, resolved.timestampOffsetMs),
      fullText: finalizeTranscriptText(result.result ?? ''),
    };
  } finally {
    if (resolved.path !== audioPath) {
      void NitroFS.unlink(resolved.path).catch(() => {});
    }
    endWhisperNativeWork();
  }
};

type LongOptions = {
  getContext: () => WhisperContext;
  recycleContext?: () => Promise<void>;
  audioPath: string;
  language: string;
  customWords: string[];
  vadEnabled: boolean;
  vadPolicy: TranscriptionVadPolicy;
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
    chunkProfile: TranscriptionChunkProfile;
    avgSecondsPerChunk?: number;
  }) => void;
  cancelled: () => boolean;
  setStop: (fn: () => Promise<void>) => void;
};

type ChunkTranscribeParams = {
  getContext: () => WhisperContext;
  transcribePath: string;
  language: string;
  prompt: string | undefined;
  setStop: (fn: () => Promise<void>) => void;
  cancelled: () => boolean;
};

const transcribeChunkFile = async ({
  getContext,
  transcribePath,
  language,
  prompt,
  setStop,
  cancelled,
}: ChunkTranscribeParams): Promise<unknown> => {
  if (cancelled() || !canRunWhisperGpuWork()) {
    throw new TranscriptionError('native_abort');
  }

  const { stop: chunkStop, promise: rawPromise } = getContext().transcribe(transcribePath, {
    ...BASE_TRANSCRIBE_OPTIONS,
    language,
    ...(prompt ? { prompt } : {}),
  });

  setStop(chunkStop);

  try {
    const raw = await rawPromise;
    if (cancelled()) {
      throw new TranscriptionError('native_abort');
    }
    return raw;
  } finally {
    setStop(async () => {});
  }
};

const transcribeLong = async ({
  getContext,
  recycleContext,
  audioPath,
  language,
  customWords,
  vadEnabled,
  vadPolicy,
  totalDurationSec,
  chunkProfile,
  contextRecycleChunks,
  onProgress,
  resume,
  onChunkCompleted,
  cancelled,
  setStop,
}: LongOptions): Promise<TranscribeAudioResult> => {
  let activeChunkProfile = chunkProfile;
  let chunks: AudioChunk[] = splitAudioIntoChunks(
    totalDurationSec,
    activeChunkProfile.chunkDurationSec,
    activeChunkProfile.chunkOverlapSec,
  );

  let total = chunks.length;
  const startChunkIndex = Math.max(0, Math.min(resume?.startChunkIndex ?? 0, total));
  const allSegments: TranscriptSegment[] = [...(resume?.segments ?? [])];
  let fullText = (resume?.fullText ?? '').trim();
  let segmentOffset = allSegments.length;
  let resolvedLanguage = language;
  const benchmark = new TranscriptionRuntimeBenchmark();

  if (startChunkIndex > 0) {
    onProgress?.(startChunkIndex, total);
  }

  for (let i = startChunkIndex; i < chunks.length; i++) {
    if (cancelled() || !canRunWhisperGpuWork()) {
      throw new TranscriptionError('native_abort');
    }

    const chunk = chunks[i];
    const chunkLanguage = resolvedLanguage;

    const prompt = buildChunkPrompt(fullText, customWords);

    if (!canRunWhisperGpuWork()) {
      throw new TranscriptionError('native_abort');
    }

    beginWhisperNativeWork();
    const chunkStartedAt = Date.now();
    let raw: unknown;
    let result: WhisperTranscribeResult = { result: '', segments: [] };
    const chunkAudioPath = `${audioPath}.chunk-${chunk.index}.wav`;
    let vadTrimPath: string | null = null;
    let chunkVadOffsetMs = 0;
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

      const resolved = await resolveTranscriptionPath(
        chunkPath,
        vadEnabled,
        chunk.durationMs,
        vadPolicy,
      );
      if (resolved.skipped) {
        onChunkCompleted?.({
          chunkIndex: i,
          totalChunks: total,
          fullText,
          segments: allSegments,
          chunkProfile: activeChunkProfile,
          avgSecondsPerChunk: benchmark.getAverageSecondsPerChunk() ?? undefined,
        });
        onProgress?.(i + 1, total);
        continue;
      }

      const transcribePath = resolved.path;
      chunkVadOffsetMs = resolved.timestampOffsetMs;
      const usedVadTrim = transcribePath !== chunkPath;
      if (usedVadTrim) {
        vadTrimPath = transcribePath;
      }

      raw = await transcribeChunkFile({
        getContext,
        transcribePath,
        language: chunkLanguage,
        prompt,
        setStop,
        cancelled,
      });
      result = normalizeTranscriptionResult(raw);

      if (language === 'auto' && resolvedLanguage === 'auto') {
        const detectedLanguage = extractDetectedLanguage(raw);
        if (detectedLanguage) {
          resolvedLanguage = detectedLanguage;
        }
      }

      if (result.segments.length === 0 && usedVadTrim) {
        raw = await transcribeChunkFile({
          getContext,
          transcribePath: chunkPath,
          language: chunkLanguage,
          prompt,
          setStop,
          cancelled,
        });
        chunkVadOffsetMs = 0;
        result = normalizeTranscriptionResult(raw);
        if (language === 'auto' && resolvedLanguage === 'auto') {
          const detectedLanguage = extractDetectedLanguage(raw);
          if (detectedLanguage) {
            resolvedLanguage = detectedLanguage;
          }
        }
      }
    } finally {
      endWhisperNativeWork();
      if (vadTrimPath) {
        void NitroFS.unlink(vadTrimPath).catch(() => {});
      }
      void NitroFS.unlink(chunkAudioPath).catch(() => {});
    }

    benchmark.record(chunk.durationMs / 1000, Date.now() - chunkStartedAt);

    const timestampOffsetMs = chunk.offsetMs + chunkVadOffsetMs;

    const previousEndMs = getLatestSegmentEndMs(allSegments);
    const chunkSegments = trimOverlappedSegments(
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
    const nextText = acceptedSegmentText || fallbackText;
    const dedupedText = dedupeChunkTextOverlap(fullText, nextText);
    fullText = appendText(fullText, dedupedText);

    onChunkCompleted?.({
      chunkIndex: i,
      totalChunks: total,
      fullText,
      segments: allSegments,
      chunkProfile: activeChunkProfile,
      avgSecondsPerChunk: benchmark.getAverageSecondsPerChunk() ?? undefined,
    });
    onProgress?.(i + 1, total);

    if (benchmark.shouldAdaptProfile()) {
      const adaptedProfile = benchmark.adaptChunkProfile(activeChunkProfile);
      if (
        adaptedProfile &&
        adaptedProfile.chunkDurationSec !== activeChunkProfile.chunkDurationSec
      ) {
        activeChunkProfile = adaptedProfile;
        chunks = rebuildRemainingChunks(chunks, i, totalDurationSec, activeChunkProfile);
        total = chunks.length;
      }
    }

    if (
      recycleContext &&
      i + 1 < chunks.length &&
      (i + 1 - startChunkIndex) % contextRecycleChunks === 0
    ) {
      await recycleContext();
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 200));
  }

  return { segments: allSegments, fullText: finalizeTranscriptText(fullText) };
};
