export type TranscriptionErrorCode =
  | 'native_abort'
  | 'native_busy'
  | 'audio_missing'
  | 'checkpoint_unreadable'
  | 'model_missing'
  | 'model_load_failed'
  | 'unknown';

export class TranscriptionError extends Error {
  readonly code: TranscriptionErrorCode;
  readonly cause?: unknown;

  constructor(code: TranscriptionErrorCode, message?: string, options?: { cause?: unknown }) {
    super(message ?? code);
    this.name = 'TranscriptionError';
    this.code = code;
    this.cause = options?.cause;
  }
}

export const createTranscriptionError = (
  code: TranscriptionErrorCode,
  cause?: unknown,
): TranscriptionError => {
  const message = cause instanceof Error ? cause.message : undefined;
  return new TranscriptionError(code, message, { cause });
};

const KNOWN_TRANSCRIPTION_ERROR_CODES = new Set<TranscriptionErrorCode>([
  'native_abort',
  'native_busy',
  'audio_missing',
  'checkpoint_unreadable',
  'model_missing',
  'model_load_failed',
  'unknown',
]);

export const resolveNativeTranscriptionFailure = (payload: {
  code: string;
  message: string;
}): TranscriptionError => {
  if (KNOWN_TRANSCRIPTION_ERROR_CODES.has(payload.code as TranscriptionErrorCode)) {
    return new TranscriptionError(payload.code as TranscriptionErrorCode, payload.message);
  }

  const inferred = getTranscriptionErrorCode(new Error(payload.message || payload.code));
  return new TranscriptionError(inferred, payload.message || payload.code);
};

export const getTranscriptionErrorCode = (err: unknown): TranscriptionErrorCode => {
  if (err instanceof TranscriptionError) {
    return err.code;
  }

  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if (msg.includes('abort') || msg.includes('cancel') || msg.includes('stop')) {
    return 'native_abort';
  }
  if (
    msg.includes('busy') ||
    msg.includes('lock') ||
    msg.includes('timeout') ||
    msg.includes('already_running')
  ) {
    return 'native_busy';
  }
  if (
    msg.includes('model') &&
    (msg.includes('not found') ||
      msg.includes('weight.bin') ||
      msg.includes('incomplete') ||
      msg.includes('whisperkit') ||
      msg.includes('failed to load'))
  ) {
    return 'model_load_failed';
  }
  if (
    msg.includes('audio') &&
    (msg.includes('missing') || msg.includes('not found') || msg.includes('enoent'))
  ) {
    return 'audio_missing';
  }
  if (msg.includes('enoent') || msg.includes('no such file') || msg.includes('file not found')) {
    return 'audio_missing';
  }
  if (msg.includes('failed to load the model')) {
    return 'model_load_failed';
  }
  return 'unknown';
};

export const isAbortTranscriptionError = (err: unknown): boolean =>
  getTranscriptionErrorCode(err) === 'native_abort';

export const shouldQueueWhisperResetForError = (err: unknown): boolean => {
  const code = getTranscriptionErrorCode(err);
  return code === 'native_abort' || code === 'native_busy' || code === 'unknown';
};
