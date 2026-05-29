import { navigationRef } from '@/app/navigation/navigationRef';
import { useRecordStore } from '@/entities/record';

export function isRecordingDetailFocused(recordId: string): boolean {
  if (!navigationRef.isReady()) return false;

  const route = navigationRef.getCurrentRoute();
  if (route?.name !== 'RecordingDetail') return false;

  const params = route.params as { record?: { id?: string } } | undefined;
  return params?.record?.id === recordId;
}

/** After summary regeneration, surface the note in inbox when the user is not on its detail screen. */
export function markUnreadAfterSummaryRegenerationIfNeeded(
  recordId: string,
  wasRegeneration: boolean,
): void {
  if (!wasRegeneration) return;
  if (isRecordingDetailFocused(recordId)) return;

  const record = useRecordStore.getState().records.find((r) => r.id === recordId);
  if (!record || record.status === 'archived') return;

  void useRecordStore.getState().markAsUnread(recordId);
}
