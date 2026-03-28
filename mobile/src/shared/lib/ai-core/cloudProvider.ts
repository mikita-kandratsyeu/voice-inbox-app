import {
  type AiApiResult,
  type AskApiResult,
  pollAiMessage,
  pollAskResult,
  postAiMessage,
  postAskQuestion,
} from '@/shared/lib/ai-api';

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
  const postResult = await postAiMessage({
    id: request.id,
    transcript: request.transcript,
    model: ctx.selectedAIModel,
    options: {
      summaryStyle: ctx.summaryStyle,
      taskStrictness: ctx.taskStrictness,
      outputLanguage: ctx.aiOutputLanguage,
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
  const postResult = await postAskQuestion({
    id: request.id,
    transcript: request.transcript,
    question: request.question,
    model: ctx.selectedAIModel,
    summary: request.summary,
    tasks: request.tasks,
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
