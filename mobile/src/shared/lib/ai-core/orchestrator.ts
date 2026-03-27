import { isExperimentalPrivateAiEnabled } from '@/shared/config/buildEnv';

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

export const AIOrchestrator = {
  async runSummaryTasks(
    request: SummaryTaskRequest,
    ctx: AiExecutionContext,
  ): Promise<SummaryTaskResult> {
    const effectiveCtx: AiExecutionContext = {
      ...ctx,
      aiExecutionMode: resolveMode(ctx.aiExecutionMode),
    };

    return runCloudSummaryTasks(request, effectiveCtx);
  },

  async runAsk(request: AskRequest, ctx: AiExecutionContext): Promise<AskTaskResult> {
    const effectiveCtx: AiExecutionContext = {
      ...ctx,
      aiExecutionMode: resolveMode(ctx.aiExecutionMode),
    };

    return runCloudAsk(request, effectiveCtx);
  },
};
