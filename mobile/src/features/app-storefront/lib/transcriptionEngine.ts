import type { TranscriptionEngine } from '@/entities/settings';
import { IS_IOS } from '@/shared/lib';

export function shouldUseAppleSpeechTranscription(
  engine: TranscriptionEngine,
  isProActive: boolean,
): boolean {
  return IS_IOS && isProActive && engine === 'apple_speech';
}

export function reconcileTranscriptionEngine(
  engine: TranscriptionEngine,
  isProActive: boolean,
): TranscriptionEngine {
  if (engine === 'apple_speech' && (!IS_IOS || !isProActive)) {
    return 'whisper';
  }
  return engine;
}
