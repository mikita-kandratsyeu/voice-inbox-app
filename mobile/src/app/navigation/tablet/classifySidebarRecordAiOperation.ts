import type { RecordListItem } from '@/entities/record';

/** Dominant AI activity shown in tablet sidebar nav processing affordances. */
export type TabletSidebarAiOperationKind =
  | 'transcription'
  | 'summary'
  | 'speakers'
  | 'translation'
  | 'ask';

const isProcessingStatus = (status: string | undefined): boolean =>
  status === 'loading_model' || status === 'processing';

/** Classify a single in-flight record for sidebar indicators (highest-signal wins). */
export function classifySidebarRecordAiOperation(
  record: Pick<
    RecordListItem,
    | 'aiStatus'
    | 'summaryStatus'
    | 'tasksStatus'
    | 'translationStatus'
    | 'askAiStatus'
    | 'meetingDialogueStatus'
  >,
): TabletSidebarAiOperationKind | null {
  if (isProcessingStatus(record.aiStatus)) {
    return 'transcription';
  }
  if (record.meetingDialogueStatus === 'processing') {
    return 'speakers';
  }
  if (isProcessingStatus(record.summaryStatus) || isProcessingStatus(record.tasksStatus)) {
    return 'summary';
  }
  if (isProcessingStatus(record.askAiStatus)) {
    return 'ask';
  }
  if (isProcessingStatus(record.translationStatus)) {
    return 'translation';
  }
  return null;
}

const KIND_PRIORITY: Record<TabletSidebarAiOperationKind, number> = {
  transcription: 5,
  speakers: 4,
  summary: 3,
  ask: 2,
  translation: 1,
};

/** Pick the operation kind to display when several records are active in one nav section. */
export function pickDominantSidebarAiOperationKind(
  kinds: ReadonlyArray<TabletSidebarAiOperationKind>,
): TabletSidebarAiOperationKind | null {
  if (kinds.length === 0) return null;

  const counts = new Map<TabletSidebarAiOperationKind, number>();
  for (const kind of kinds) {
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }

  let best: TabletSidebarAiOperationKind | null = null;
  let bestScore = 0;
  for (const [kind, count] of counts) {
    const score = count * 10 + KIND_PRIORITY[kind];
    if (score > bestScore) {
      bestScore = score;
      best = kind;
    }
  }
  return best;
}
