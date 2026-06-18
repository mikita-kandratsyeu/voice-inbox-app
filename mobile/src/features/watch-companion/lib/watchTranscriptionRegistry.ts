import type { VoiceRecord } from '@/entities/record';

export type WatchTranscriptionStarter = (
  record: VoiceRecord,
) => void;

let starter: WatchTranscriptionStarter | null = null;

export function registerWatchTranscriptionStarter(fn: WatchTranscriptionStarter | null): void {
  starter = fn;
}

export function getWatchTranscriptionStarter(): WatchTranscriptionStarter | null {
  return starter;
}
