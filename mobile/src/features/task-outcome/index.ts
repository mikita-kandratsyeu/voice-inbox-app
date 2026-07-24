export {
  applyTaskCompletion,
  applyTaskReopen,
  normalizeOutcomeText,
  patchTaskInList,
} from './lib/applyTaskCompletion';
export { buildFollowUpNoteDraft } from './lib/buildFollowUpNoteDraft';
export {
  completePendingTaskFollowUp,
  enrichRecordWithFollowUpDraft,
  finalizeTaskFollowUp,
  prepareRecordForTaskFollowUp,
} from './lib/finalizeTaskFollowUp';
export type {
  PendingTaskFollowUp,
  TaskCompletionInput,
  TaskCompletionTarget,
  TaskFollowUpDraft,
} from './lib/types';
export {
  consumePendingTaskFollowUp,
  peekPendingTaskFollowUp,
  usePendingTaskFollowUpStore,
} from './model/pendingTaskFollowUpStore';
export { useTaskCompletionFlow } from './model/useTaskCompletionFlow';
export { TaskOutcomePreview } from './ui/TaskOutcomePreview';
export { TaskOutcomeSheet } from './ui/TaskOutcomeSheet';
