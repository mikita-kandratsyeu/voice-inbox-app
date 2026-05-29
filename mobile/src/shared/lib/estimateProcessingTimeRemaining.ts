import type { PrivateLocalLlmBudget } from '@/entities/settings';

import { resolvePrivateSummaryMaxTokens } from './ai-core/local-provider/localAiConstants';

export type ProcessingTimeEstimateContext = 'transcription' | 'private_llm' | 'cloud_ai';

export type ProcessingTimeEstimateInput = {
  context: ProcessingTimeEstimateContext;
  phase: 'loading_model' | 'processing';
  progressPercent: number;
  startedAtMs?: number;
  nowMs?: number;
  transcriptCharCount?: number;
  durationMs?: number;
  transcriptionSegments?: { current: number; total: number };
  privateLlmBudget?: PrivateLocalLlmBudget;
  /** Extra cloud time when meeting speaker breakdown runs after summary. */
  cloudMeetingDialogue?: boolean;
};

const MIN_REMAINING_SEC = 5;
const PRIVATE_GEN_PROGRESS_FLOOR = 12;

function clampProgress(progressPercent: number): number {
  return Math.min(100, Math.max(0, progressPercent));
}

function estimateTranscriptionTotalSeconds(durationMs: number): number {
  const audioSec = Math.max(0, durationMs / 1000);
  const modelLoadSec = 14;

  if (audioSec < 30) {
    return modelLoadSec + Math.max(10, Math.round(audioSec * 1.1));
  }

  const chunkCount = Math.max(1, Math.ceil(audioSec / 21));
  return modelLoadSec + chunkCount * 20;
}

function estimatePrivateModelLoadSeconds(): number {
  return 18;
}

function estimatePrivateGenerationSeconds(
  transcriptCharCount: number,
  budget: PrivateLocalLlmBudget,
): number {
  const chars = Math.max(0, transcriptCharCount);
  const tokenBudget = resolvePrivateSummaryMaxTokens(budget);
  const promptSec = Math.min(22, Math.round(chars / 140));
  const outputSec = Math.round(tokenBudget * 0.055);
  return 6 + promptSec + outputSec;
}

function estimateCloudTotalSeconds(transcriptCharCount: number, cloudMeetingDialogue: boolean): number {
  const chars = Math.max(0, transcriptCharCount);
  const base = 14 + Math.round(chars / 550) * 9;
  const meetingExtra = cloudMeetingDialogue ? 42 : 0;
  return Math.min(240, base + meetingExtra);
}

/**
 * Seconds left for processing UIs. Uses elapsed time for cloud (faux progress) and
 * transcript/audio size; private mode blends token-based progress with elapsed time.
 */
export function estimateProcessingSecondsRemaining(input: ProcessingTimeEstimateInput): number {
  const now = input.nowMs ?? Date.now();
  const elapsedSec =
    input.startedAtMs != null ? Math.max(0, (now - input.startedAtMs) / 1000) : 0;
  const progress = clampProgress(input.progressPercent);
  const chars = input.transcriptCharCount ?? 0;

  if (input.context === 'transcription') {
    const segments = input.transcriptionSegments;
    if (segments && segments.total > 0) {
      const remainingChunks = Math.max(0, segments.total - segments.current);
      const modelTail = input.phase === 'loading_model' ? 14 : 4;
      return Math.max(MIN_REMAINING_SEC, remainingChunks * 20 + modelTail);
    }

    const total = estimateTranscriptionTotalSeconds(input.durationMs ?? 0);
    const fromProgress = ((100 - progress) / 100) * total;
    if (input.startedAtMs == null) {
      return Math.max(MIN_REMAINING_SEC, Math.round(fromProgress));
    }
    const fromElapsed = total - elapsedSec;
    return Math.max(MIN_REMAINING_SEC, Math.round(Math.min(fromProgress, fromElapsed)));
  }

  if (input.context === 'cloud_ai') {
    if (input.startedAtMs == null) {
      const total = estimateCloudTotalSeconds(chars, Boolean(input.cloudMeetingDialogue));
      return Math.max(MIN_REMAINING_SEC, Math.round(((100 - progress) / 100) * total));
    }
    const total = estimateCloudTotalSeconds(chars, Boolean(input.cloudMeetingDialogue));
    let remaining = total - elapsedSec;
    if (remaining < MIN_REMAINING_SEC && progress < 98) {
      remaining = Math.max(MIN_REMAINING_SEC, 12 + (98 - progress) * 0.35);
    }
    return Math.max(MIN_REMAINING_SEC, Math.round(remaining));
  }

  const budget = input.privateLlmBudget ?? 'balanced';
  const modelLoad = estimatePrivateModelLoadSeconds();
  const generation = estimatePrivateGenerationSeconds(chars, budget);
  const total = modelLoad + generation;

  if (input.phase === 'loading_model' || progress <= PRIVATE_GEN_PROGRESS_FLOOR) {
    if (input.startedAtMs == null) {
      return Math.max(MIN_REMAINING_SEC, Math.round(total));
    }
    const loadRemaining = modelLoad - elapsedSec;
    const totalRemaining = total - elapsedSec;
    return Math.max(MIN_REMAINING_SEC, Math.round(Math.max(loadRemaining, totalRemaining)));
  }

  const genSpan = 100 - PRIVATE_GEN_PROGRESS_FLOOR;
  const genProgress = (progress - PRIVATE_GEN_PROGRESS_FLOOR) / genSpan;
  const fromProgress = (1 - genProgress) * generation;
  if (input.startedAtMs == null) {
    return Math.max(MIN_REMAINING_SEC, Math.round(fromProgress + modelLoad * 0.4));
  }
  const fromElapsed = total - elapsedSec;
  return Math.max(MIN_REMAINING_SEC, Math.round(Math.min(fromProgress, fromElapsed)));
}

export function formatProcessingTimeRemaining(
  seconds: number,
  t: (key: string, options?: { count: number }) => string,
  namespace: 'privateAi' | 'cloudAi' | 'transcription',
): string {
  const rounded = Math.max(MIN_REMAINING_SEC, Math.round(seconds));
  if (rounded < 60) {
    return t(`${namespace}.secondsLeft`, { count: rounded });
  }
  return t(`${namespace}.minutesLeft`, { count: Math.ceil(rounded / 60) });
}
