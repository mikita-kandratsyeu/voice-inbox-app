export type LocalAiErrorCode =
  | 'model_not_downloaded'
  | 'parse_failed'
  | 'empty_summary'
  | 'empty_answer'
  | 'transcript_too_long'
  | 'generic';

export class LocalAiError extends Error {
  readonly code: LocalAiErrorCode;

  constructor(code: LocalAiErrorCode, message?: string, options?: { cause?: unknown }) {
    super(message ?? code);
    this.code = code;
    this.name = 'LocalAiError';
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}
