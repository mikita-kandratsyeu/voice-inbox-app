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
    super(message ?? code, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.code = code;
    this.name = 'LocalAiError';
  }
}
