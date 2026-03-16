import { NativeModules, Platform } from 'react-native';

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
    if (__DEV__) {
      console.warn('[convertToWav] AudioConverter native module not available');
    }
    return null;
  }
  try {
    const inArg = Platform.OS === 'ios' ? toFileUri(inputPath) : inputPath;
    const outArg = Platform.OS === 'ios' ? toFileUri(outputPath) : outputPath;
    const result = await AudioConverter.convertToWav(inArg, outArg);
    return result ?? null;
  } catch (e: unknown) {
    if (__DEV__) {
      const err = e as { code?: string; message?: string };
      console.warn(
        '[convertToWav] Error:',
        err?.message ?? String(e),
        '| code:',
        err?.code,
        '| full:',
        e,
      );
    }
    return null;
  }
}
