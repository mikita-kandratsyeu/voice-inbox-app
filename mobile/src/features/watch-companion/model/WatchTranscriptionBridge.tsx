import { useEffect } from 'react';

import type { VoiceRecord } from '@/entities/record';
import { useTranscription } from '@/features/transcription';

import { registerWatchTranscriptionStarter } from '../lib/watchTranscriptionRegistry';

/** Registers transcription starter for headless Watch imports (no UI). */
export function WatchTranscriptionBridge() {
  const { startTranscription } = useTranscription();

  useEffect(() => {
    const starter = (record: VoiceRecord) => {
      void startTranscription(record, undefined, { enforceMinDuration: true });
    };
    registerWatchTranscriptionStarter(starter);
    return () => registerWatchTranscriptionStarter(null);
  }, [startTranscription]);

  return null;
}
