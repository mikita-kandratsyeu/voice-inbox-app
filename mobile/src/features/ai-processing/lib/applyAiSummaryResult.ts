import type { RecordClassification, TaskItem, VoiceRecord } from '@/entities/record';
import { mergeManualTasksWithAi } from '@/entities/record/model/mergeManualTasksWithAi';
import { mergeSimilarExtractedTasks } from '@/entities/record/model/mergeSimilarExtractedTasks';
import {
  buildNormalizedTextSet,
  collectExistingTaskTextsForAiPrompt,
  filterAiTaskItemsByNormalizedSet,
  filterNextStepsByNormalizedTaskSet,
  normalizedManualTaskTextSet,
} from '@/entities/record/model/taskTextDedupe';
import type { AiModelRoutingMode } from '@/entities/settings';
import { getAutoTitleForDate } from '@/screens/record/lib/getAutoTitle';
import type { AiProcessingResult, AiTask } from '@/shared/lib/ai-api';
import { normalizeTaskDeadlineFields } from '@/shared/lib/normalizeTaskDeadlineFields';

function aiTaskToTaskItemFields(task: AiTask): Pick<TaskItem, 'deadline' | 'deadlineTime'> {
  if (task.deadlineTime) {
    return {
      deadline: task.deadline ?? undefined,
      deadlineTime: task.deadlineTime,
    };
  }

  const normalized = normalizeTaskDeadlineFields(task.deadline);
  if (!normalized) return {};

  return {
    deadline: normalized.deadline,
    ...(normalized.deadlineTime ? { deadlineTime: normalized.deadlineTime } : {}),
  };
}

export type ApplyAiSummaryResultParams = {
  record: VoiceRecord;
  result: AiProcessingResult;
  isProActive: boolean;
  recordIsMeeting: boolean;
  includeMeetingSpeakerBreakdown: boolean;
  aiExecutionMode: 'smart_hybrid' | 'private_experimental';
  aiModelRoutingMode?: AiModelRoutingMode;
  effectiveLocalAiModelId: string;
  /** Cloud phase-1: summary/tasks only; meeting dialogue arrives later. */
  skipMeetingDialogue?: boolean;
  generationStartedAt: number;
  updateSummary: (id: string, summary: string) => Promise<void>;
  updateTasks: (id: string, tasks: TaskItem[]) => Promise<void>;
  updateTags: (id: string, tags: string[]) => Promise<void>;
  updateAiExtras: (
    id: string,
    data: {
      classification?: RecordClassification | null;
      keyPhrases?: string[];
      nextSteps?: string[];
      meetingDialogue?: string | null;
      summaryReasoning?: string | null;
      summaryAiModel?: string | null;
      summaryAiModelLabel?: string | null;
      summaryAiModelMode?: AiModelRoutingMode | null;
      summaryTokensPrompt?: number | null;
      summaryTokensCompletion?: number | null;
      summaryGenerationMs?: number | null;
    },
  ) => Promise<void>;
  renameRecord: (id: string, title: string) => Promise<void>;
  getLatestRecord: (id: string) => VoiceRecord | undefined;
};

/** Persists summary, tasks, tags, classification, and optional meeting dialogue from AI output. */
export async function applyAiSummaryResult(params: ApplyAiSummaryResultParams): Promise<void> {
  const {
    record,
    result,
    isProActive,
    recordIsMeeting,
    includeMeetingSpeakerBreakdown,
    aiExecutionMode,
    aiModelRoutingMode,
    effectiveLocalAiModelId,
    skipMeetingDialogue = false,
    generationStartedAt,
    updateSummary,
    updateTasks,
    updateTags,
    updateAiExtras,
    renameRecord,
    getLatestRecord,
  } = params;

  const {
    summary,
    suggestedTitle,
    tasks: rawTasks,
    tags,
    classification,
    keyPhrases,
    nextSteps,
    meetingDialogueMarkdown,
    reasoning: summaryReasoningRaw,
    model: summaryModelRaw,
    modelLabel: summaryModelLabelRaw,
    tokenUsage: summaryTokenUsageRaw,
  } = result;

  const aiTaskItems: TaskItem[] = rawTasks.map((t, index) => ({
    id: `${record.id}-task-${index}`,
    text: t.title,
    isDone: false,
    ...aiTaskToTaskItemFields(t),
    priority: t.priority,
    source: 'ai',
  }));

  const latest = getLatestRecord(record.id);
  const manualNorm = normalizedManualTaskTextSet(latest?.tasks);
  const aiTaskItemsFiltered = filterAiTaskItemsByNormalizedSet(aiTaskItems, manualNorm);
  const aiTasksDeduped = mergeSimilarExtractedTasks(aiTaskItemsFiltered);
  const mergedTasks = mergeManualTasksWithAi(latest?.tasks, aiTasksDeduped);
  const taskNormMerged = buildNormalizedTextSet(mergedTasks.map((x) => x.text));
  const rawNextSteps = nextSteps ?? [];
  const nextStepsForStore = filterNextStepsByNormalizedTaskSet(rawNextSteps, taskNormMerged);

  const prevHadMeetingDialogue = Boolean(latest?.meetingDialogue?.trim());
  const meetingDialogueForStore =
    !skipMeetingDialogue && includeMeetingSpeakerBreakdown && meetingDialogueMarkdown?.trim()
      ? meetingDialogueMarkdown.trim()
      : null;

  await updateSummary(record.id, summary);
  await updateTasks(record.id, mergedTasks);

  if (suggestedTitle?.trim()) {
    const currentRecord = getLatestRecord(record.id);
    if (currentRecord) {
      const standardTitle = getAutoTitleForDate(currentRecord.createdAt);
      if (currentRecord.title === standardTitle) {
        await renameRecord(record.id, suggestedTitle.trim());
      }
    }
  }
  if (tags.length > 0) {
    await updateTags(record.id, tags);
  }

  let resolvedClassification: RecordClassification | undefined =
    isProActive && recordIsMeeting ? 'meeting' : classification;
  if (!isProActive && resolvedClassification === 'meeting') {
    resolvedClassification = undefined;
  }

  const classificationClearedForNonPro = !isProActive && classification === 'meeting';

  const summaryReasoningForStore = summaryReasoningRaw?.trim() ? summaryReasoningRaw.trim() : null;

  const shouldUpdateAiExtras =
    resolvedClassification ||
    (keyPhrases && keyPhrases.length > 0) ||
    rawNextSteps.length > 0 ||
    nextStepsForStore.length > 0 ||
    classificationClearedForNonPro ||
    (includeMeetingSpeakerBreakdown && !skipMeetingDialogue) ||
    prevHadMeetingDialogue ||
    summaryReasoningForStore != null ||
    aiExecutionMode === 'smart_hybrid';

  const summaryModelModeForStore =
    aiExecutionMode === 'smart_hybrid' && aiModelRoutingMode ? aiModelRoutingMode : null;
  const hideResolvedCloudModel =
    aiExecutionMode === 'smart_hybrid' && aiModelRoutingMode === 'auto';

  const summaryModelForStore = hideResolvedCloudModel
    ? ''
    : summaryModelRaw?.trim() ||
      (aiExecutionMode === 'private_experimental' ? effectiveLocalAiModelId : '');
  const summaryModelLabelForStore = hideResolvedCloudModel
    ? null
    : summaryModelLabelRaw?.trim()
      ? summaryModelLabelRaw.trim()
      : null;

  if (shouldUpdateAiExtras) {
    await updateAiExtras(record.id, {
      classification: resolvedClassification ?? null,
      keyPhrases: keyPhrases ?? [],
      nextSteps: nextStepsForStore,
      ...(includeMeetingSpeakerBreakdown && !skipMeetingDialogue
        ? {
            meetingDialogue: meetingDialogueForStore,
            ...(meetingDialogueForStore ? { meetingSpeakerLabels: null } : {}),
          }
        : {}),
      ...(summaryReasoningForStore != null ? { summaryReasoning: summaryReasoningForStore } : {}),
    });
  }

  const summaryTokensForStore =
    summaryTokenUsageRaw && summaryTokenUsageRaw.prompt >= 0 && summaryTokenUsageRaw.completion >= 0
      ? {
          summaryTokensPrompt: Math.floor(summaryTokenUsageRaw.prompt),
          summaryTokensCompletion: Math.floor(summaryTokenUsageRaw.completion),
        }
      : {
          summaryTokensPrompt: null,
          summaryTokensCompletion: null,
        };

  const summaryGenerationMs = Date.now() - generationStartedAt;

  if (
    summaryModelForStore ||
    summaryModelLabelForStore ||
    summaryModelModeForStore ||
    summaryTokenUsageRaw ||
    summaryGenerationMs > 0
  ) {
    await updateAiExtras(record.id, {
      ...(hideResolvedCloudModel
        ? { summaryAiModel: null, summaryAiModelLabel: null }
        : {
            ...(summaryModelForStore ? { summaryAiModel: summaryModelForStore } : {}),
            ...(summaryModelLabelForStore
              ? { summaryAiModelLabel: summaryModelLabelForStore }
              : {}),
          }),
      ...(summaryModelModeForStore ? { summaryAiModelMode: summaryModelModeForStore } : {}),
      ...summaryTokensForStore,
      ...(summaryGenerationMs > 0 ? { summaryGenerationMs } : {}),
    });
  }
}

/** Task texts for cloud/local re-runs (deduped manual + AI). */
export function existingTaskTextsForRecord(
  getLatestRecord: (id: string) => VoiceRecord | undefined,
  recordId: string,
): string[] {
  const snapshot = getLatestRecord(recordId);
  return collectExistingTaskTextsForAiPrompt(snapshot?.tasks);
}
