import type { WhisperModelId } from '@/entities/settings';
import { WHISPER_MODELS } from '@/entities/settings';
import { IOS_WHISPER_KIT_STORAGE_MODEL_IDS } from '@/features/model-manager/lib/whisperKitModelStorage';

export const IOS_WHISPER_KIT_MODELS = WHISPER_MODELS.filter((model) =>
  (IOS_WHISPER_KIT_STORAGE_MODEL_IDS as readonly WhisperModelId[]).includes(model.id),
);
