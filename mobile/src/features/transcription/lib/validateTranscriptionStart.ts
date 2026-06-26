import { DeviceInfoModule } from 'react-native-nitro-device-info';

import type { VoiceRecord } from '@/entities/record';
import type { WhisperModelId, WhisperModelWeightsFormat } from '@/entities/settings';
import { NitroFS } from '@/shared/lib/fs';
import { resolveAudioPath } from '@/shared/lib/recordings';
import { getWhisperModelPath } from '@/shared/lib/whisper';
import {
  getWhisperKitModelsDir,
  mapWhisperModelIdToWhisperKitModel,
} from '@/shared/lib/whisper/whisperKitModelPath';

import {
  isIosNativeTranscriptionAvailable,
  isWhisperKitModelDownloaded,
} from './nativeTranscription';
import { shouldSkipGgmlPreflightForIos } from './transcriptionModelEngine';

const MIN_FREE_SPACE_BUFFER_BYTES = 100 * 1024 * 1024;
const WAV_BYTES_PER_MS_ESTIMATE = 64;

export type TranscriptionStartValidationFailure =
  | 'app_in_background'
  | 'no_audio_path'
  | 'record_in_trash'
  | 'transcription_busy'
  | 'model_not_downloaded'
  | 'model_missing'
  | 'model_file_missing'
  | 'audio_file_missing'
  | 'insufficient_storage';

export type TranscriptionStartValidationResult =
  | { ok: true; normalizedAudioPath: string; modelPath: string }
  | {
      ok: false;
      reason: TranscriptionStartValidationFailure;
      normalizedAudioPath?: string;
      modelPath?: string;
      requiredBytes?: number;
      availableBytes?: number;
    };

function normalizePath(path: string): string {
  const resolved = resolveAudioPath(path);
  return resolved.startsWith('file://') ? resolved.slice(7) : resolved;
}

function estimateRequiredTempBytes(record: VoiceRecord, normalizedAudioPath: string): number {
  if (normalizedAudioPath.toLowerCase().endsWith('.wav')) {
    return MIN_FREE_SPACE_BUFFER_BYTES;
  }

  return Math.max(
    MIN_FREE_SPACE_BUFFER_BYTES,
    (record.durationMs ?? 0) * WAV_BYTES_PER_MS_ESTIMATE + MIN_FREE_SPACE_BUFFER_BYTES,
  );
}

export async function validateTranscriptionStart(input: {
  record: VoiceRecord;
  modelId: WhisperModelId;
  modelFormat: WhisperModelWeightsFormat;
  modelStatus: string;
  appIsActive: boolean;
  transcriptionBusy: boolean;
  /** When false, WhisperKit must already be on disk (no Hugging Face download). */
  networkAvailable?: boolean;
}): Promise<TranscriptionStartValidationResult> {
  if (!input.appIsActive) {
    return { ok: false, reason: 'app_in_background' };
  }

  if (!input.record.audioPath) {
    return { ok: false, reason: 'no_audio_path' };
  }

  if ((input.record.status as string) === 'trash') {
    return { ok: false, reason: 'record_in_trash' };
  }

  if (input.transcriptionBusy) {
    return { ok: false, reason: 'transcription_busy' };
  }

  const normalizedAudioPath = normalizePath(input.record.audioPath);
  const modelPath = getWhisperModelPath(input.modelId, input.modelFormat);

  if (shouldSkipGgmlPreflightForIos(input.modelId)) {
    const nativeAvailable = await isIosNativeTranscriptionAvailable();
    if (!nativeAvailable) {
      return { ok: false, reason: 'model_missing', normalizedAudioPath, modelPath };
    }

    const whisperKitModel = mapWhisperModelIdToWhisperKitModel(input.modelId);
    const modelOnDisk = await isWhisperKitModelDownloaded(whisperKitModel, getWhisperKitModelsDir());
    if (!modelOnDisk) {
      return { ok: false, reason: 'model_not_downloaded', normalizedAudioPath, modelPath };
    }
  } else {
    if (input.modelStatus !== 'downloaded') {
      return { ok: false, reason: 'model_not_downloaded', normalizedAudioPath, modelPath };
    }

    const hasModelFile = await NitroFS.exists(modelPath);
    if (!hasModelFile) {
      return { ok: false, reason: 'model_file_missing', normalizedAudioPath, modelPath };
    }
  }

  const hasAudioFile = await NitroFS.exists(normalizedAudioPath);
  if (!hasAudioFile) {
    return { ok: false, reason: 'audio_file_missing', normalizedAudioPath, modelPath };
  }

  const requiredBytes = estimateRequiredTempBytes(input.record, normalizedAudioPath);
  const availableBytes = DeviceInfoModule.getFreeDiskStorage();
  if (availableBytes > 0 && availableBytes < requiredBytes) {
    return {
      ok: false,
      reason: 'insufficient_storage',
      normalizedAudioPath,
      modelPath,
      requiredBytes,
      availableBytes,
    };
  }

  return { ok: true, normalizedAudioPath, modelPath };
}
