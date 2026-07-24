import { DeviceEventEmitter, NativeEventEmitter, NativeModules, Platform } from 'react-native';

export type PdfExtractProgress = {
  current: number;
  total: number;
};

function normalizeProgress(payload: {
  current?: number;
  total?: number;
}): PdfExtractProgress | null {
  const current = payload.current;
  const total = payload.total;
  if (typeof current !== 'number' || typeof total !== 'number' || total <= 0) {
    return null;
  }
  return { current, total };
}

export function subscribeToPdfExtractProgress(
  listener: (progress: PdfExtractProgress) => void,
): () => void {
  if (Platform.OS === 'ios') {
    const mod = NativeModules.PdfExtractProgressModule;
    if (!mod) {
      return () => {};
    }
    const emitter = new NativeEventEmitter(mod);
    const sub = emitter.addListener('progress', (payload: { current?: number; total?: number }) => {
      const progress = normalizeProgress(payload);
      if (progress) listener(progress);
    });
    return () => sub.remove();
  }

  const sub = DeviceEventEmitter.addListener(
    'pdfExtractProgress',
    (payload: { current?: number; total?: number }) => {
      const progress = normalizeProgress(payload);
      if (progress) listener(progress);
    },
  );
  return () => sub.remove();
}
