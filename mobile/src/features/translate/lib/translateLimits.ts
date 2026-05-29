/** ~3 translate API chunks at 4k — longer texts drift and fail more often. */
export const MAX_TRANSLATE_TRANSCRIPT_CHARS = 12_000;

export function isTranscriptTooLongForTranslate(transcript: string): boolean {
  return transcript.trim().length > MAX_TRANSLATE_TRANSCRIPT_CHARS;
}
