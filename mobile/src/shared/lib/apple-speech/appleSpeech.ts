import { NativeModules, Platform } from 'react-native';

import type { TranscriptSegment } from '@/entities/record';
import type { TranscriptionLanguage } from '@/entities/settings';

import { transcriptionLanguageToAppleLocale } from './transcriptionLanguageToAppleLocale';

export type AppleSpeechAuthStatus =
  | 'authorized'
  | 'denied'
  | 'restricted'
  | 'notDetermined';

type AppleSpeechNativeSegment = {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  startTime: string;
};

type AppleSpeechNativeResult = {
  fullText: string;
  segments: AppleSpeechNativeSegment[];
};

type AppleSpeechModuleNative = {
  getAuthorizationStatus: () => Promise<AppleSpeechAuthStatus>;
  requestAuthorization: () => Promise<AppleSpeechAuthStatus>;
  isOnDeviceAvailable: (localeIdentifier: string) => Promise<boolean>;
  transcribeFile: (
    path: string,
    onDevice: boolean,
    locale: string,
  ) => Promise<AppleSpeechNativeResult>;
  cancel: () => Promise<void>;
};

const NativeAppleSpeech = NativeModules.AppleSpeechModule as
  | AppleSpeechModuleNative
  | undefined;

export const isAppleSpeechModuleAvailable = (): boolean =>
  Platform.OS === 'ios' && NativeAppleSpeech != null;

export class AppleSpeechError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AppleSpeechError';
    this.code = code;
  }
}

function requireModule(): AppleSpeechModuleNative {
  if (!isAppleSpeechModuleAvailable()) {
    throw new AppleSpeechError('UNAVAILABLE', 'Apple Speech is only available on iOS');
  }
  return NativeAppleSpeech!;
}

export async function getAppleSpeechAuthorizationStatus(): Promise<AppleSpeechAuthStatus> {
  return requireModule().getAuthorizationStatus();
}

export async function requestAppleSpeechAuthorization(): Promise<AppleSpeechAuthStatus> {
  return requireModule().requestAuthorization();
}

export async function ensureAppleSpeechAuthorized(): Promise<void> {
  let status = await getAppleSpeechAuthorizationStatus();
  if (status === 'notDetermined') {
    status = await requestAppleSpeechAuthorization();
  }
  if (status !== 'authorized') {
    throw new AppleSpeechError(
      'NOT_AUTHORIZED',
      status === 'denied' || status === 'restricted'
        ? 'Speech recognition permission was denied'
        : 'Speech recognition permission is required',
    );
  }
}

export async function isAppleSpeechOnDeviceAvailable(
  language: TranscriptionLanguage,
): Promise<boolean> {
  const locale = transcriptionLanguageToAppleLocale(language);
  return requireModule().isOnDeviceAvailable(locale);
}

const mapSegments = (raw: AppleSpeechNativeSegment[]): TranscriptSegment[] =>
  raw
    .filter((s) => s.text.trim().length > 0)
    .map((s) => ({
      id: s.id,
      text: s.text.trim(),
      startMs: s.startMs,
      endMs: s.endMs,
      startTime: s.startTime,
    }));

export type TranscribeWithAppleSpeechResult = {
  fullText: string;
  segments: TranscriptSegment[];
  skipped?: boolean;
};

const MIN_DURATION_MS = 500;

export async function transcribeWithAppleSpeech(options: {
  audioPath: string;
  durationMs: number;
  language: TranscriptionLanguage;
  onProgress?: (percent: number) => void;
  isCancelled?: () => boolean;
}): Promise<TranscribeWithAppleSpeechResult> {
  const { audioPath, durationMs, language, onProgress, isCancelled } = options;

  if (durationMs < MIN_DURATION_MS) {
    return { fullText: '', segments: [], skipped: true };
  }

  if (isCancelled?.()) {
    throw new AppleSpeechError('CANCELLED', 'Transcription cancelled');
  }

  await ensureAppleSpeechAuthorized();

  const locale = transcriptionLanguageToAppleLocale(language);
  const onDeviceAvailable = await isAppleSpeechOnDeviceAvailable(language);

  if (!onDeviceAvailable) {
    throw new AppleSpeechError(
      'ON_DEVICE_UNAVAILABLE',
      'On-device speech recognition is not available for this language',
    );
  }

  onProgress?.(10);

  const normalizedPath = audioPath.startsWith('file://') ? audioPath : `file://${audioPath}`;

  const stopRef = { cancel: () => requireModule().cancel() };

  try {
    onProgress?.(35);
    const raw = await requireModule().transcribeFile(normalizedPath, true, locale);

    if (isCancelled?.()) {
      throw new AppleSpeechError('CANCELLED', 'Transcription cancelled');
    }

    onProgress?.(100);
    const segments = mapSegments(raw.segments ?? []);
    const fullText = (raw.fullText ?? '').trim() || segments.map((s) => s.text).join(' ');

    return { fullText, segments };
  } catch (err) {
    if (err instanceof AppleSpeechError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes('cancel')) {
      throw new AppleSpeechError('CANCELLED', message);
    }
    throw new AppleSpeechError('TRANSCRIBE_ERROR', message);
  } finally {
    void stopRef.cancel().catch(() => {});
  }
}

export function cancelAppleSpeechTranscription(): Promise<void> {
  if (!isAppleSpeechModuleAvailable()) {
    return Promise.resolve();
  }
  return requireModule().cancel();
}
