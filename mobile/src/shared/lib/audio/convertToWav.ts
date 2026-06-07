import { NativeModules } from 'react-native';

import { diagWarn } from '@/shared/lib/appLogger';
import { IS_IOS } from '@/shared/lib/platform';

export const WAV_TARGET_SAMPLE_RATE = 16000;
export const WAV_TARGET_CHANNELS = 1;

const { AudioConverter } = NativeModules;

function toFileUri(path: string): string {
  if (!path) return path;
  const normalized = path.replace(/^file:\/\//, '');
  return normalized.startsWith('/') ? `file://${normalized}` : path;
}

export async function convertToWav(inputPath: string, outputPath: string): Promise<string | null> {
  if (!AudioConverter || typeof AudioConverter.convertToWav !== 'function') {
    diagWarn('[convertToWav] AudioConverter native module not available');
    return null;
  }
  try {
    const inArg = IS_IOS ? toFileUri(inputPath) : inputPath;
    const outArg = IS_IOS ? toFileUri(outputPath) : outputPath;
    const result = await AudioConverter.convertToWav(inArg, outArg);
    return result ?? null;
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    diagWarn('[convertToWav] Error:', err?.message ?? String(e), '| code:', err?.code);
    return null;
  }
}

export async function createWavChunk(
  inputPath: string,
  outputPath: string,
  startMs: number,
  durationMs: number,
): Promise<string | null> {
  if (!AudioConverter || typeof AudioConverter.createWavChunk !== 'function') {
    diagWarn('[createWavChunk] AudioConverter native module not available');
    return null;
  }
  try {
    const inArg = IS_IOS ? toFileUri(inputPath) : inputPath;
    const outArg = IS_IOS ? toFileUri(outputPath) : outputPath;
    const result = await AudioConverter.createWavChunk(inArg, outArg, startMs, durationMs);
    return result ?? null;
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    diagWarn('[createWavChunk] Error:', err?.message ?? String(e), '| code:', err?.code);
    return null;
  }
}
