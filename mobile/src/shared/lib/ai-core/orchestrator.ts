import { isExperimentalPrivateAiEnabled } from '@/shared/config/buildEnv';
import { i18n } from '@/shared/lib';

import { runCloudAsk, runCloudSummaryTasks } from './cloudProvider';
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
  if (!isExperimentalPrivateAiEnabled()) {
    return 'smart_hybrid';
  }

  return mode;
}

function guardPrivateMode(request: { transcript: string }, ctx: AiExecutionContext) {
  if (ctx.aiExecutionMode !== 'private_experimental') return null;

  if (ctx.privateCapabilityTier === 'unavailable') {
    return {
      ok: false as const,
      provider: 'cloud' as const,
      mode: ctx.aiExecutionMode,
      error: i18n.t('ai.privateModeUnavailable'),
    };
  }

  if (ctx.privateCapabilityTier === 'limited' && request.transcript.length > 5000) {
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

    return runCloudSummaryTasks(request, effectiveCtx);
  },

  async runAsk(request: AskRequest, ctx: AiExecutionContext): Promise<AskTaskResult> {
    const effectiveCtx: AiExecutionContext = {
      ...ctx,
      aiExecutionMode: resolveMode(ctx.aiExecutionMode),
    };
    const guardResult = guardPrivateMode(request, effectiveCtx);
    if (guardResult) return guardResult;

    return runCloudAsk(request, effectiveCtx);
  },
};
