import { getExperimentalPrivateAiEnabled } from '@/shared/config/runtimeConfig';
import { i18n } from '@/shared/lib';

import { runCloudAsk, runCloudSummaryTasks } from './cloudProvider';
import { runLocalAsk, runLocalSummaryTasks } from './localProvider';
import type {
  AiExecutionContext,
  AskRequest,
  AskTaskResult,
  SummaryTaskRequest,
  SummaryTaskResult,
} from './types';

function resolveMode(
  mode: AiExecutionContext['aiExecutionMode'],
): AiExecutionContext['aiExecutionMode'] {
  if (!getExperimentalPrivateAiEnabled()) {
    return 'smart_hybrid';
  }

  return mode;
}

function guardPrivateMode(request: { transcript: string }, ctx: AiExecutionContext) {
  if (ctx.aiExecutionMode !== 'private_experimental') return null;

  if (!ctx.isLocalLlmModelDownloaded) {
    return {
      ok: false as const,
      provider: 'cloud' as const,
      mode: ctx.aiExecutionMode,
      error: i18n.t('ai.privateModeModelNotDownloaded'),
    };
  }

  if (
    (ctx.privateCapabilityTier === 'limited' || ctx.privateCapabilityTier === 'unavailable') &&
    request.transcript.length > 5000
  ) {
    return {
      ok: false as const,
      provider: 'cloud' as const,
      mode: ctx.aiExecutionMode,
      error: i18n.t('ai.privateModeLimitedTooLong'),
    };
  }

  return null;
}

export const AIOrchestrator = {
  async runSummaryTasks(
    request: SummaryTaskRequest,
    ctx: AiExecutionContext,
  ): Promise<SummaryTaskResult> {
    const effectiveCtx: AiExecutionContext = {
      ...ctx,
      aiExecutionMode: resolveMode(ctx.aiExecutionMode),
    };
    const guardResult = guardPrivateMode(request, effectiveCtx);
    if (guardResult) return guardResult;

    if (effectiveCtx.aiExecutionMode === 'private_experimental') {
      return runLocalSummaryTasks(request, effectiveCtx);
    }

    return runCloudSummaryTasks(request, effectiveCtx);
  },

  async runAsk(request: AskRequest, ctx: AiExecutionContext): Promise<AskTaskResult> {
    const effectiveCtx: AiExecutionContext = {
      ...ctx,
      aiExecutionMode: resolveMode(ctx.aiExecutionMode),
    };
    const guardResult = guardPrivateMode(request, effectiveCtx);
    if (guardResult) return guardResult;

    if (effectiveCtx.aiExecutionMode === 'private_experimental') {
      return runLocalAsk(request, effectiveCtx);
    }

    return runCloudAsk(request, effectiveCtx);
  },
};
