import type { TranscriptSegment } from '@/entities/record';
import type { WhisperModelId } from '@/entities/settings';
import {
  getSpeakerKitModelsDir,
  getWhisperKitModelsDir,
  mapWhisperModelIdToWhisperKitModel,
} from '@/shared/lib/whisper/whisperKitModelPath';

import { cleanTranscriptSegmentText } from './cleanTranscriptText';
import { mapEngineSegmentsToTranscriptSegments } from './mapEngineSegments';
import {
  isIosNativeTranscriptionAvailable,
  startNativeTranscriptionJob,
} from './nativeTranscription';
import type { TranscriptionChunkProfile } from './transcribeAudio';
import { resolveNativeTranscriptionFailure, TranscriptionError } from './transcriptionErrors';
import { canRunWhisperGpuWork } from './whisperAppState';

export type TranscribeAudioIosOptions = {
  jobId: string;
  audioPath: string;
  durationMs: number;
  language?: string;
  modelId: WhisperModelId;
  diarization?: boolean;
  maxSpeakers?: number;
  customWords?: string[];
  chunkProfile?: TranscriptionChunkProfile;
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
  }) => void;
};

export type TranscribeAudioIosResult = {
  segments: TranscriptSegment[];
  fullText: string;
  speakers: Array<{ id: string; label: string }>;
  detectedLanguage?: string;
  skipped?: boolean;
};

type TranscribeAudioIosHandle = {
  promise: Promise<TranscribeAudioIosResult>;
  stop: () => Promise<void>;
};

const DEFAULT_CHUNK_PROFILE: TranscriptionChunkProfile = {
  chunkDurationSec: 45,
  chunkOverlapSec: 4,
};

export const transcribeAudioIos = (
  options: TranscribeAudioIosOptions,
): TranscribeAudioIosHandle => {
  const {
    jobId,
    audioPath,
    durationMs,
    language = 'auto',
    modelId,
    diarization = false,
    maxSpeakers,
    customWords = [],
    chunkProfile = DEFAULT_CHUNK_PROFILE,
    onProgress,
    resume,
    onChunkCompleted,
  } = options;

  let stopHandle: (() => Promise<void>) | null = null;
  let cancelled = false;

  const stop = async (): Promise<void> => {
    cancelled = true;
    if (stopHandle) {
      await stopHandle();
      stopHandle = null;
    }
  };

  const promise = (async (): Promise<TranscribeAudioIosResult> => {
    if (!canRunWhisperGpuWork()) {
      throw new TranscriptionError('native_abort');
    }

    const available = await isIosNativeTranscriptionAvailable();
    if (!available) {
      throw new TranscriptionError('model_missing');
    }

    const whisperKitModel = mapWhisperModelIdToWhisperKitModel(modelId);
    const modelCachePath = getWhisperKitModelsDir();
    const speakerKitCachePath = getSpeakerKitModelsDir();

    return await new Promise<TranscribeAudioIosResult>((resolve, reject) => {
      const handle = startNativeTranscriptionJob(
        {
          jobId,
          audioPath,
          durationMs,
          language,
          whisperKitModel,
          modelCachePath,
          speakerKitCachePath,
          diarization,
          maxSpeakers,
          customWords,
          chunkProfile,
          resume,
        },
        {
          onProgress: (event) => {
            if (cancelled) {
              return;
            }
            if (event.currentChunk != null && event.totalChunks != null) {
              onProgress?.(event.currentChunk, event.totalChunks);
            }
          },
          onPartialResult: (payload) => {
            if (cancelled) {
              return;
            }
            onChunkCompleted?.({
              chunkIndex: payload.checkpointIndex,
              totalChunks: payload.totalChunks,
              fullText: payload.fullText,
              segments: payload.segments,
              chunkProfile,
            });
          },
          onCompleted: (result) => {
            if (cancelled) {
              reject(new TranscriptionError('native_abort'));
              return;
            }
            const segments = mapEngineSegmentsToTranscriptSegments(result.segments).filter(
              (segment) => segment.text.length > 0,
            );
            const fullText = cleanTranscriptSegmentText(
              segments.map((segment) => segment.text).join(' ') || result.fullText,
            );
            resolve({
              segments,
              fullText,
              speakers: result.speakers,
              detectedLanguage: result.detectedLanguage,
              skipped: result.skipped,
            });
          },
          onFailed: (error) => {
            if (cancelled || error.code === 'native_abort') {
              reject(new TranscriptionError('native_abort'));
              return;
            }
            reject(resolveNativeTranscriptionFailure(error));
          },
          onCancelled: () => {
            reject(new TranscriptionError('native_abort'));
          },
        },
      );

      stopHandle = handle.cancel;
    });
  })();

  return { promise, stop };
};
