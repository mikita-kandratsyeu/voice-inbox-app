import { i18n } from '@/shared/lib';
import {
  type AiApiResult,
  type AskApiResult,
  pollAiMessage,
  pollAskResult,
  postAiMessage,
  postAskQuestion,
} from '@/shared/lib/ai-api';
import { AI_REQUEST_CANCELLED, isAiGenerationCancelledError } from '@/shared/lib/ai-api/abort';
import { ensureCloudAiThirdPartyConsent } from '@/shared/lib/cloud-ai-consent';
import { isNonNegativeFiniteNumber } from '@/shared/lib/type-guards';

import type {
  AiExecutionContext,
  AskRequest,
  AskTaskResult,
  SummaryTaskRequest,
  SummaryTaskResult,
} from './types';

function mapPostError(
  response: Extract<AiApiResult, { ok: false }> | Extract<AskApiResult, { ok: false }>,
  mode: AiExecutionContext['aiExecutionMode'],
  errorFallback: string,
) {
  if ('limitExceeded' in response && response.limitExceeded) {
    return {
      ok: false as const,
      provider: 'cloud' as const,
      mode,
      limitExceeded: true,
      usage: response.usage,
      error: errorFallback,
    };
  }

  return {
    ok: false as const,
    provider: 'cloud' as const,
    mode,
    error: response.error,
  };
}

function cloudSummaryCancelledFailure(
  mode: AiExecutionContext['aiExecutionMode'],
): SummaryTaskResult {
  return {
    ok: false,
    provider: 'cloud',
    mode,
    error: AI_REQUEST_CANCELLED,
  };
}

function cloudAskCancelledFailure(mode: AiExecutionContext['aiExecutionMode']): AskTaskResult {
  return {
    ok: false,
    provider: 'cloud',
    mode,
    error: AI_REQUEST_CANCELLED,
  };
}

function isPostCancelled(
  postResult: Extract<AiApiResult, { ok: false }> | Extract<AskApiResult, { ok: false }>,
): boolean {
  return 'error' in postResult && postResult.error === AI_REQUEST_CANCELLED;
}

export async function runCloudSummaryTasks(
  request: SummaryTaskRequest,
  ctx: AiExecutionContext,
): Promise<SummaryTaskResult> {
  const consentOk = await ensureCloudAiThirdPartyConsent();

  if (!consentOk) {
    return {
      ok: false,
      provider: 'cloud',
      mode: ctx.aiExecutionMode,
      error: i18n.t('cloudAiConsent.declinedHint'),
    };
  }

  const fetchOptions = { signal: request.abortSignal };

  if (request.abortSignal?.aborted) {
    return cloudSummaryCancelledFailure(ctx.aiExecutionMode);
  }

  const postResult = await postAiMessage(
    {
      id: request.id,
      transcript: request.transcript,
      model: ctx.selectedAIModel,
      modelMode: ctx.aiModelRoutingMode,
      routingContext: {
        taskType: 'summary_tasks',
        transcriptChars: request.transcript.length,
      },
      messageTtlSeconds: ctx.cloudMessageTtlSeconds,
      options: {
        summaryStyle: ctx.summaryStyle,
        taskStrictness: ctx.taskStrictness,
        outputLanguage: ctx.aiOutputLanguage,
        ...(request.processingPreset ? { processingPreset: request.processingPreset } : {}),
        ...(request.existingTaskTexts?.length
          ? { existingTaskTexts: request.existingTaskTexts }
          : {}),
        ...(request.taskExtractionHint?.trim()
          ? { taskExtractionHint: request.taskExtractionHint.trim() }
          : {}),
        ...(request.recordingMarks?.length ? { recordingMarks: request.recordingMarks } : {}),
      },
      ...(request.transcriptSegments?.length
        ? {
            transcriptSegments: request.transcriptSegments.map((s) => ({
              ...(isNonNegativeFiniteNumber(s.startMs) ? { startMs: s.startMs } : {}),
              ...(isNonNegativeFiniteNumber(s.endMs) ? { endMs: s.endMs } : {}),
              text: s.text,
            })),
          }
        : {}),
    },
    fetchOptions,
  );

  if (!postResult.ok) {
    if (isPostCancelled(postResult)) {
      return cloudSummaryCancelledFailure(ctx.aiExecutionMode);
    }
    return mapPostError(postResult, ctx.aiExecutionMode, 'AI weekly limit exceeded');
  }

  const pollResult = await pollAiMessage(request.id, postResult.data.syncToken, {
    ...fetchOptions,
    expectAsyncMeetingDialogue: request.expectAsyncMeetingDialogue,
    onSummaryReady: request.onCloudSummaryReady,
  });
  if (!pollResult.ok) {
    if (isAiGenerationCancelledError(pollResult.error)) {
      return cloudSummaryCancelledFailure(ctx.aiExecutionMode);
    }
    return {
      ok: false,
      provider: 'cloud',
      mode: ctx.aiExecutionMode,
      error: pollResult.error,
    };
  }

  return {
    ok: true,
    provider: 'cloud',
    mode: ctx.aiExecutionMode,
    result: pollResult.result,
    meetingDialogueStatus: pollResult.meetingDialogueStatus,
  };
}

export async function runCloudAsk(
  request: AskRequest,
  ctx: AiExecutionContext,
): Promise<AskTaskResult> {
  const consentOk = await ensureCloudAiThirdPartyConsent();

  if (!consentOk) {
    return {
      ok: false,
      provider: 'cloud',
      mode: ctx.aiExecutionMode,
      error: i18n.t('cloudAiConsent.declinedHint'),
    };
  }

  const fetchOptions = { signal: request.abortSignal };

  if (request.abortSignal?.aborted) {
    return cloudAskCancelledFailure(ctx.aiExecutionMode);
  }

  const postResult = await postAskQuestion(
    {
      id: request.id,
      transcript: request.transcript,
      question: request.question,
      model: ctx.selectedAIModel,
      modelMode: ctx.aiModelRoutingMode,
      routingContext: {
        taskType: 'ask',
        transcriptChars: request.transcript.length,
      },
      messageTtlSeconds: ctx.cloudMessageTtlSeconds,
      summary: request.summary,
      tasks: request.tasks,
      ...(request.priorTurns?.length ? { priorTurns: request.priorTurns } : {}),
      ...(request.recordingMarks?.length ? { recordingMarks: request.recordingMarks } : {}),
    },
    fetchOptions,
  );

  if (!postResult.ok) {
    if (isPostCancelled(postResult)) {
      return cloudAskCancelledFailure(ctx.aiExecutionMode);
    }
    return mapPostError(postResult, ctx.aiExecutionMode, 'AI weekly limit exceeded');
  }

  const pollResult = await pollAskResult(request.id, postResult.data.syncToken, fetchOptions);
  if (!pollResult.ok) {
    if (pollResult.error === AI_REQUEST_CANCELLED) {
      return cloudAskCancelledFailure(ctx.aiExecutionMode);
    }
    return {
      ok: false,
      provider: 'cloud',
      mode: ctx.aiExecutionMode,
      error: pollResult.error,
    };
  }

  return {
    ok: true,
    provider: 'cloud',
    mode: ctx.aiExecutionMode,
    result: pollResult.result,
  };
}
