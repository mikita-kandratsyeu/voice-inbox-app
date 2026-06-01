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

function guardPrivateMode(_request: { transcript: string }, ctx: AiExecutionContext) {
  if (ctx.aiExecutionMode !== 'private_experimental') return null;

  if (!ctx.isLocalLlmModelDownloaded) {
    return {
      ok: false as const,
      provider: 'cloud' as const,
      mode: ctx.aiExecutionMode,
      error: i18n.t('ai.privateModeModelNotDownloaded'),
    };
  }

  // Transcript length is not checked here: prepareTranscriptForLocalLlm trims it
  // to the tier-appropriate char limit before inference, and localPromptFitsLlmContext
  // catches genuine context overflows. A pre-trim character check would reject
  // transcripts that would have fit fine after truncation.

  return null;
}

export const AIOrchestrator = {
  async runSummaryTasks(
    request: SummaryTaskRequest,
    ctx: AiExecutionContext,
  ): Promise<SummaryTaskResult> {
    const guardResult = guardPrivateMode(request, ctx);
    if (guardResult) return guardResult;

    if (ctx.aiExecutionMode === 'private_experimental') {
      return runLocalSummaryTasks(request, ctx);
    }

    return runCloudSummaryTasks(request, ctx);
  },

  async runAsk(request: AskRequest, ctx: AiExecutionContext): Promise<AskTaskResult> {
    const guardResult = guardPrivateMode(request, ctx);
    if (guardResult) return guardResult;

    if (ctx.aiExecutionMode === 'private_experimental') {
      return runLocalAsk(request, ctx);
    }

    return runCloudAsk(request, ctx);
  },
};
