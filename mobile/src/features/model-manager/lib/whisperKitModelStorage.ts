import type { WhisperModelId } from '@/entities/settings';
import { IS_IOS } from '@/shared/lib/platform';
import {
  getSpeakerKitModelsDir,
  getWhisperKitModelsDir,
  mapWhisperModelIdToWhisperKitModel,
} from '@/shared/lib/whisper/whisperKitModelPath';

import {
  deleteNativeSpeakerKitModel,
  deleteNativeWhisperKitModel,
  getNativeSpeakerKitStorageBytes,
  getNativeWhisperKitModelStorageBytes,
  isSpeakerKitModelDownloaded,
  isWhisperKitModelDownloaded,
} from '../../transcription/lib/nativeTranscription';

export const IOS_WHISPER_KIT_STORAGE_MODEL_IDS = [
  'whisper-base',
  'whisper-small',
  'whisper-medium',
] as const satisfies readonly WhisperModelId[];

export async function isWhisperKitModelOnDisk(modelId: WhisperModelId): Promise<boolean> {
  if (!IS_IOS) {
    return false;
  }
  return isWhisperKitModelDownloaded(
    mapWhisperModelIdToWhisperKitModel(modelId),
    getWhisperKitModelsDir(),
  );
}

export async function getWhisperKitModelStorageBytes(modelId: WhisperModelId): Promise<number> {
  if (!IS_IOS) {
    return 0;
  }
  const bytes = await getNativeWhisperKitModelStorageBytes(
    mapWhisperModelIdToWhisperKitModel(modelId),
    getWhisperKitModelsDir(),
  );
  return Math.max(0, bytes);
}

export async function deleteWhisperKitModel(modelId: WhisperModelId): Promise<void> {
  if (!IS_IOS) {
    return;
  }
  await deleteNativeWhisperKitModel(
    mapWhisperModelIdToWhisperKitModel(modelId),
    getWhisperKitModelsDir(),
  );
}

export async function listDownloadedWhisperKitModels(): Promise<
  Array<{ id: WhisperModelId; bytes: number }>
> {
  if (!IS_IOS) {
    return [];
  }

  const entries = await Promise.all(
    IOS_WHISPER_KIT_STORAGE_MODEL_IDS.map(async (id) => {
      const bytes = await getWhisperKitModelStorageBytes(id);
      return bytes > 0 ? { id, bytes } : null;
    }),
  );

  return entries.filter((entry) => entry != null) as Array<{ id: WhisperModelId; bytes: number }>;
}

export async function deleteAllWhisperKitModels(): Promise<void> {
  if (!IS_IOS) {
    return;
  }

  await Promise.all(IOS_WHISPER_KIT_STORAGE_MODEL_IDS.map((id) => deleteWhisperKitModel(id)));
}

export async function getSpeakerKitStorageBytesOnDisk(): Promise<number> {
  if (!IS_IOS) {
    return 0;
  }
  const bytes = await getNativeSpeakerKitStorageBytes(getSpeakerKitModelsDir());
  return Math.max(0, bytes);
}

export async function isSpeakerKitModelOnDisk(): Promise<boolean> {
  if (!IS_IOS) {
    return false;
  }
  return isSpeakerKitModelDownloaded(getSpeakerKitModelsDir());
}

export async function deleteSpeakerKitModelFromDisk(): Promise<void> {
  if (!IS_IOS) {
    return;
  }
  await deleteNativeSpeakerKitModel(getSpeakerKitModelsDir());
}

export async function deleteAllArgmaxTranscriptionModels(): Promise<void> {
  await deleteAllWhisperKitModels();
  await deleteSpeakerKitModelFromDisk();
}
