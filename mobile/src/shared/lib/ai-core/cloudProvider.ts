import { i18n } from '@/shared/lib';
import {
  type AiApiResult,
  type AskApiResult,
  pollAiMessage,
  pollAskResult,
  postAiMessage,
  postAskQuestion,
} from '@/shared/lib/ai-api';
import { ensureCloudAiThirdPartyConsent } from '@/shared/lib/cloud-ai-consent';

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

  const postResult = await postAiMessage({
    id: request.id,
    transcript: request.transcript,
    model: ctx.selectedAIModel,
    modelMode: ctx.aiModelRoutingMode,
    routingContext: {
      taskType: 'summary_tasks',
      transcriptChars: request.transcript.length,
    },
    options: {
      summaryStyle: ctx.summaryStyle,
      taskStrictness: ctx.taskStrictness,
      outputLanguage: ctx.aiOutputLanguage,
      ...(request.existingTaskTexts?.length
        ? { existingTaskTexts: request.existingTaskTexts }
        : {}),
      ...(request.taskExtractionHint?.trim()
        ? { taskExtractionHint: request.taskExtractionHint.trim() }
        : {}),
    },
  });

  if (!postResult.ok) {
    return mapPostError(postResult, ctx.aiExecutionMode, 'AI weekly limit exceeded');
  }

  const pollResult = await pollAiMessage(request.id, postResult.data.syncToken);
  if (!pollResult.ok) {
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

  const postResult = await postAskQuestion({
    id: request.id,
    transcript: request.transcript,
    question: request.question,
    model: ctx.selectedAIModel,
    modelMode: ctx.aiModelRoutingMode,
    routingContext: {
      taskType: 'ask',
      transcriptChars: request.transcript.length,
    },
    summary: request.summary,
    tasks: request.tasks,
    ...(request.priorTurns?.length ? { priorTurns: request.priorTurns } : {}),
  });

  if (!postResult.ok) {
    return mapPostError(postResult, ctx.aiExecutionMode, 'AI weekly limit exceeded');
  }

  const pollResult = await pollAskResult(request.id, postResult.data.syncToken);
  if (!pollResult.ok) {
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
