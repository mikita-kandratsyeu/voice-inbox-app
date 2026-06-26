import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

import type { TranscriptSegment } from '@/entities/record';
import { isArray, isNumber, isRecord, isString } from '@/shared/lib/type-guards';

import { cleanTranscriptSegmentText } from './cleanTranscriptText';

import type {
  TranscriptionChunkProfile,
  TranscriptionProgressEvent,
  TranscriptionResult,
} from './transcriptionEngineTypes';

type NativeTranscriptionModule = {
  isAvailable: () => Promise<boolean>;
  prepareModel: (model: string, modelCachePath: string) => Promise<{ ready: boolean }>;
  isModelDownloaded: (model: string, modelCachePath: string) => Promise<boolean>;
  getModelStorageBytes: (model: string, modelCachePath: string) => Promise<number>;
  deleteModel: (model: string, modelCachePath: string) => Promise<void>;
  isSpeakerKitDownloaded: (speakerKitCachePath: string) => Promise<boolean>;
  getSpeakerKitStorageBytes: (speakerKitCachePath: string) => Promise<number>;
  deleteSpeakerKitModel: (speakerKitCachePath: string) => Promise<void>;
  startTranscriptionJob: (options: Record<string, unknown>) => Promise<{ jobId: string }>;
  cancelTranscriptionJob: (jobId: string) => Promise<void>;
  cleanupTranscriptionJob: (jobId: string) => Promise<void>;
};

const MODULE_NAME = 'VoiceInboxTranscriptionModule';

const getNativeModule = (): NativeTranscriptionModule | null => {
  if (Platform.OS !== 'ios') {
    return null;
  }
  const mod = NativeModules[MODULE_NAME] as NativeTranscriptionModule | undefined;
  return mod ?? null;
};

export const isIosNativeTranscriptionAvailable = async (): Promise<boolean> => {
  const mod = getNativeModule();
  if (!mod?.isAvailable) {
    return false;
  }
  try {
    return await mod.isAvailable();
  } catch {
    return false;
  }
};

export type StartNativeTranscriptionJobOptions = {
  jobId: string;
  audioPath: string;
  durationMs: number;
  language: string;
  whisperKitModel: string;
  modelCachePath: string;
  speakerKitCachePath?: string;
  diarization: boolean;
  maxSpeakers?: number;
  customWords?: string[];
  chunkProfile: TranscriptionChunkProfile;
  resume?: {
    startChunkIndex: number;
    fullText: string;
    segments: TranscriptSegment[];
  };
};

export type NativeTranscriptionListeners = {
  onProgress?: (event: TranscriptionProgressEvent) => void;
  onPartialResult?: (payload: {
    jobId: string;
    fullText: string;
    segments: TranscriptSegment[];
    checkpointIndex: number;
  }) => void;
  onCompleted?: (result: TranscriptionResult) => void;
  onFailed?: (payload: { jobId: string; code: string; message: string }) => void;
  onCancelled?: (payload: { jobId: string; checkpointAvailable: boolean }) => void;
};

const dedupeSegmentIds = (segments: TranscriptSegment[]): TranscriptSegment[] => {
  const seen = new Set<string>();
  return segments.map((segment, index) => {
    let id = segment.id;
    if (seen.has(id)) {
      id = `${id}-${segment.startMs ?? index}`;
    }
    seen.add(id);
    return id === segment.id ? segment : { ...segment, id };
  });
};

const parseSegments = (raw: unknown): TranscriptSegment[] => {
  if (!isArray(raw)) {
    return [];
  }
  const segments: TranscriptSegment[] = [];
  for (const item of raw) {
    if (!isRecord(item) || !isString(item.id) || !isString(item.text)) {
      continue;
    }
    segments.push({
      id: item.id,
      text: cleanTranscriptSegmentText(item.text),
      startTime: isString(item.startTime) ? item.startTime : '00:00',
      startMs: isNumber(item.startMs) ? item.startMs : undefined,
      endMs: isNumber(item.endMs) ? item.endMs : undefined,
      speakerId: isString(item.speakerId) ? item.speakerId : undefined,
      language: isString(item.language) ? item.language : undefined,
      isOverlapping: item.isOverlapping === true,
      tokens: isArray(item.tokens)
        ? item.tokens
            .filter((tok): tok is Record<string, unknown> => isRecord(tok) && isString(tok.text))
            .map((tok) => ({
              text: String(tok.text),
              startMs: isNumber(tok.startMs) ? tok.startMs : 0,
              endMs: isNumber(tok.endMs) ? tok.endMs : 0,
            }))
        : undefined,
    });
  }
  return dedupeSegmentIds(segments);
};

export const startNativeTranscriptionJob = (
  options: StartNativeTranscriptionJobOptions,
  listeners: NativeTranscriptionListeners,
): { cancel: () => Promise<void> } => {
  const mod = getNativeModule();
  if (!mod) {
    throw new Error('native_transcription_unavailable');
  }

  const emitter = new NativeEventEmitter(NativeModules[MODULE_NAME]);
  const subscriptions = [
    emitter.addListener('transcriptionProgress', (event: unknown) => {
      if (!isRecord(event) || !isString(event.jobId) || event.jobId !== options.jobId) {
        return;
      }
      listeners.onProgress?.({
        jobId: event.jobId,
        phase: (isString(event.phase) ? event.phase : 'transcribingChunk') as TranscriptionProgressEvent['phase'],
        currentChunk: isNumber(event.currentChunk) ? event.currentChunk : undefined,
        totalChunks: isNumber(event.totalChunks) ? event.totalChunks : undefined,
        progress: isNumber(event.progress) ? event.progress : 0,
        label: isString(event.label) ? event.label : undefined,
        partialSegments: parseSegments(event.partialSegments),
      });
    }),
    emitter.addListener('transcriptionPartialResult', (event: unknown) => {
      if (!isRecord(event) || !isString(event.jobId) || event.jobId !== options.jobId) {
        return;
      }
      listeners.onPartialResult?.({
        jobId: event.jobId,
        fullText: isString(event.fullText) ? event.fullText : '',
        segments: parseSegments(event.segments),
        checkpointIndex: isNumber(event.checkpointIndex) ? event.checkpointIndex : 0,
      });
    }),
    emitter.addListener('transcriptionCompleted', (event: unknown) => {
      if (!isRecord(event) || !isString(event.jobId) || event.jobId !== options.jobId) {
        return;
      }
      const speakers = isArray(event.speakers)
        ? event.speakers
            .filter(
              (s): s is Record<string, unknown> =>
                isRecord(s) && isString(s.id) && isString(s.label),
            )
            .map((s) => ({ id: String(s.id), label: String(s.label) }))
        : [];
      listeners.onCompleted?.({
        jobId: event.jobId,
        detectedLanguage: isString(event.detectedLanguage) ? event.detectedLanguage : undefined,
        durationMs: isNumber(event.durationMs) ? event.durationMs : options.durationMs,
        speakers,
        segments: parseSegments(event.segments).map((segment) => ({
          id: segment.id,
          text: segment.text,
          startMs: segment.startMs ?? 0,
          endMs: segment.endMs ?? 0,
          speakerId: segment.speakerId,
          language: segment.language,
          isOverlapping: segment.isOverlapping,
          tokens: segment.tokens,
        })),
        fullText: isString(event.fullText) ? event.fullText : '',
        skipped: event.skipped === true,
      });
    }),
    emitter.addListener('transcriptionFailed', (event: unknown) => {
      if (!isRecord(event) || !isString(event.jobId) || event.jobId !== options.jobId) {
        return;
      }
      listeners.onFailed?.({
        jobId: event.jobId,
        code: isString(event.code) ? event.code : 'unknown',
        message: isString(event.message) ? event.message : 'unknown',
      });
    }),
    emitter.addListener('transcriptionCancelled', (event: unknown) => {
      if (!isRecord(event) || !isString(event.jobId) || event.jobId !== options.jobId) {
        return;
      }
      listeners.onCancelled?.({
        jobId: event.jobId,
        checkpointAvailable: event.checkpointAvailable === true,
      });
    }),
  ];

  void mod
    .startTranscriptionJob({
      jobId: options.jobId,
      audioPath: options.audioPath,
      durationMs: options.durationMs,
      language: options.language,
      whisperKitModel: options.whisperKitModel,
      modelCachePath: options.modelCachePath,
      speakerKitCachePath: options.speakerKitCachePath,
      diarization: options.diarization,
      maxSpeakers: options.maxSpeakers,
      customWords: options.customWords ?? [],
      chunkDurationSec: options.chunkProfile.chunkDurationSec,
      chunkOverlapSec: options.chunkProfile.chunkOverlapSec,
      resume: options.resume,
    })
    .catch((err: unknown) => {
      listeners.onFailed?.({
        jobId: options.jobId,
        code: 'native_start_failed',
        message: err instanceof Error ? err.message : String(err),
      });
    });

  return {
    cancel: async () => {
      subscriptions.forEach((sub) => sub.remove());
      await mod.cancelTranscriptionJob(options.jobId).catch(() => {});
    },
  };
};

export const prepareNativeTranscriptionModel = async (
  whisperKitModel: string,
  modelCachePath: string,
): Promise<boolean> => {
  const mod = getNativeModule();
  if (!mod) {
    return false;
  }
  const result = await mod.prepareModel(whisperKitModel, modelCachePath);
  return result?.ready === true;
};

export const isWhisperKitModelDownloaded = async (
  whisperKitModel: string,
  modelCachePath: string,
): Promise<boolean> => {
  const mod = getNativeModule();
  if (!mod?.isModelDownloaded) {
    return false;
  }
  try {
    return await mod.isModelDownloaded(whisperKitModel, modelCachePath);
  } catch {
    return false;
  }
};

export const getNativeWhisperKitModelStorageBytes = async (
  whisperKitModel: string,
  modelCachePath: string,
): Promise<number> => {
  const mod = getNativeModule();
  if (!mod?.getModelStorageBytes) {
    return 0;
  }
  try {
    const bytes = await mod.getModelStorageBytes(whisperKitModel, modelCachePath);
    return typeof bytes === 'number' && Number.isFinite(bytes) ? bytes : 0;
  } catch {
    return 0;
  }
};

export const deleteNativeWhisperKitModel = async (
  whisperKitModel: string,
  modelCachePath: string,
): Promise<void> => {
  const mod = getNativeModule();
  if (!mod?.deleteModel) {
    throw new Error('native_transcription_unavailable');
  }
  await mod.deleteModel(whisperKitModel, modelCachePath);
};

export const isSpeakerKitModelDownloaded = async (
  speakerKitCachePath: string,
): Promise<boolean> => {
  const mod = getNativeModule();
  if (!mod?.isSpeakerKitDownloaded) {
    return false;
  }
  try {
    return await mod.isSpeakerKitDownloaded(speakerKitCachePath);
  } catch {
    return false;
  }
};

export const getNativeSpeakerKitStorageBytes = async (
  speakerKitCachePath: string,
): Promise<number> => {
  const mod = getNativeModule();
  if (!mod?.getSpeakerKitStorageBytes) {
    return 0;
  }
  try {
    const bytes = await mod.getSpeakerKitStorageBytes(speakerKitCachePath);
    return typeof bytes === 'number' && Number.isFinite(bytes) ? bytes : 0;
  } catch {
    return 0;
  }
};

export const deleteNativeSpeakerKitModel = async (speakerKitCachePath: string): Promise<void> => {
  const mod = getNativeModule();
  if (!mod?.deleteSpeakerKitModel) {
    throw new Error('native_transcription_unavailable');
  }
  await mod.deleteSpeakerKitModel(speakerKitCachePath);
};
