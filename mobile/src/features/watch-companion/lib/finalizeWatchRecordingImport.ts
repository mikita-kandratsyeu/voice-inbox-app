import { useRecordStore, type VoiceRecord } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { shouldApplyAutoTranscribeOnSave } from '@/features/app-storefront';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import { tryScheduleAutoTranscription } from '@/features/transcription';

import { getWatchTranscriptionStarter } from './watchTranscriptionRegistry';

export async function finalizeWatchRecordingImport(record: VoiceRecord): Promise<void> {
  await useRecordStore.getState().addRecord(record);

  const { autoTranscribeOnSave, aiExecutionMode } = useSettingsStore.getState();
  const applyAutoTranscribe = shouldApplyAutoTranscribeOnSave(
    autoTranscribeOnSave,
    isProActiveFromStorageSync(),
    aiExecutionMode,
  );

  if (!applyAutoTranscribe) {
    return;
  }

  const startTranscription = getWatchTranscriptionStarter();
  if (!startTranscription) {
    return;
  }

  tryScheduleAutoTranscription(
    record,
    useRecordStore.getState().records,
    (nextRecord) => startTranscription(nextRecord),
    record,
  );
}
