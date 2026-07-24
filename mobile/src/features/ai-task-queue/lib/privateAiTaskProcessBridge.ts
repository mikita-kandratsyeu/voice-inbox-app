import type { VoiceRecord } from '@/entities/record';

type ProcessRecordFn = (record: VoiceRecord) => Promise<void>;

let processRecordFn: ProcessRecordFn | null = null;

export function registerPrivateAiTaskProcessor(fn: ProcessRecordFn | null): void {
  processRecordFn = fn;
}

export async function processRecordViaPrivateAiBridge(record: VoiceRecord): Promise<boolean> {
  if (!processRecordFn) return false;
  await processRecordFn(record);
  return true;
}
