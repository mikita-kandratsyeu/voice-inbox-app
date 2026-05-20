import {
  getWhisperModelVariantId,
  type TranscriptionEngine,
  type WhisperModelId,
  type WhisperModelStatus,
  type WhisperModelVariantId,
  type WhisperModelWeightsFormat,
} from '@/entities/settings';
import { shouldUseAppleSpeechTranscription } from '@/features/app-storefront';
import { isAppleSpeechModuleAvailable } from '@/shared/lib/apple-speech';

export function canStartTranscription(options: {
  transcriptionEngine: TranscriptionEngine;
  isProActive: boolean;
  selectedWhisperModel: WhisperModelId;
  selectedWhisperModelFormat: WhisperModelWeightsFormat;
  whisperModelStatuses: Partial<Record<WhisperModelVariantId, WhisperModelStatus>>;
}): boolean {
  if (
    shouldUseAppleSpeechTranscription(options.transcriptionEngine, options.isProActive) &&
    isAppleSpeechModuleAvailable()
  ) {
    return true;
  }

  const variantId = getWhisperModelVariantId(
    options.selectedWhisperModel,
    options.selectedWhisperModelFormat,
  );
  const modelStatus = options.whisperModelStatuses[variantId] ?? 'not_downloaded';
  return modelStatus === 'downloaded';
}
