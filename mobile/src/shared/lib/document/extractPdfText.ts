import { NativeModules } from 'react-native';

import { diagWarn } from '@/shared/lib/appLogger';

const { AudioConverter } = NativeModules;

export async function extractPdfText(inputPath: string): Promise<string | null> {
  if (!AudioConverter || typeof AudioConverter.extractPdfText !== 'function') {
    diagWarn('[extractPdfText] AudioConverter.extractPdfText not available');
    return null;
  }

  const inArg = inputPath.startsWith('file://') ? inputPath : inputPath;

  try {
    const result = await AudioConverter.extractPdfText(inArg);
    return typeof result === 'string' ? result : null;
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    diagWarn('[extractPdfText] Error:', err?.message ?? String(e), '| code:', err?.code);
    return null;
  }
}
