import { MIN_TRANSCRIBE_MS } from '../config/constants';

export { MIN_TRANSCRIBE_MS };

export function isTooShortForTranscription(durationMs: number | null | undefined): boolean {
  return (durationMs ?? 0) < MIN_TRANSCRIBE_MS;
}
