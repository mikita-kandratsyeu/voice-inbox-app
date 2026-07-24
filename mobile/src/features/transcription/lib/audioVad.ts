import { NativeModules } from 'react-native';

import { diagWarn } from '@/shared/lib/appLogger';
import { IS_IOS } from '@/shared/lib/platform';

export type WavSpeechAnalysis = {
  hasSpeech: boolean;
  trimStartMs: number;
  trimDurationMs: number;
};

const { AudioConverter } = NativeModules;

function toFileUri(path: string): string {
  if (!path) return path;
  const normalized = path.replace(/^file:\/\//, '');
  return normalized.startsWith('/') ? `file://${normalized}` : path;
}

export async function analyzeWavSpeech(audioPath: string): Promise<WavSpeechAnalysis | null> {
  if (!AudioConverter || typeof AudioConverter.analyzeWavSpeech !== 'function') {
    return null;
  }

  try {
    const input = IS_IOS ? toFileUri(audioPath) : audioPath;
    const result = await AudioConverter.analyzeWavSpeech(input);
    if (!result || typeof result !== 'object') {
      return null;
    }

    return {
      hasSpeech: Boolean(result.hasSpeech),
      trimStartMs: Number(result.trimStartMs) || 0,
      trimDurationMs: Number(result.trimDurationMs) || 0,
    };
  } catch (error) {
    diagWarn('[audioVad] analyzeWavSpeech failed:', error);
    return null;
  }
}
