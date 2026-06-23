import { i18n } from '@/shared/lib';
import { AI_REQUEST_CANCELLED } from '@/shared/lib/ai-api/abort';

import { runCloudAsk, runCloudInboxAsk, runCloudSummaryTasks } from './cloudProvider';
import { runLocalMeetingDialogue } from './local-provider/localAiMeetingDialogue';
import { runLocalAsk, runLocalSummaryTasks } from './localProvider';
import {
  runPrivateRemoteAsk,
  runPrivateRemoteInboxAsk,
  runPrivateRemoteSummaryTasks,
} from './privateRemoteProvider';
import type {
  AiExecutionContext,
  AskRequest,
  AskTaskResult,
  InboxAskRequest,
  InboxAskTaskResult,
  SummaryTaskRequest,
  SummaryTaskResult,
} from './types';

function guardPrivateMode(_request: { transcript: string }, ctx: AiExecutionContext) {
  if (ctx.aiExecutionMode !== 'private_experimental') return null;

  if (ctx.privateCapabilityTier === 'unavailable') {
    return {
      ok: false as const,
      provider: 'cloud' as const,
      mode: ctx.aiExecutionMode,
      error: i18n.t('ai.privateModeUnavailable'),
    };
  }

  if (ctx.privateAiProvider === 'local' && !ctx.isLocalLlmModelDownloaded) {
    return {
      ok: false as const,
      provider: 'cloud' as const,
      mode: ctx.aiExecutionMode,
      error: i18n.t('ai.privateModeModelNotDownloaded'),
    };
  }

  return null;
}

async function runPrivateSummaryTasks(
  request: SummaryTaskRequest,
  ctx: AiExecutionContext,
): Promise<SummaryTaskResult> {
  if (!request.expectAsyncMeetingDialogue) {
    return runLocalSummaryTasks(request, ctx);
  }

  const pass1 = await runLocalSummaryTasks(
    {
      ...request,
      processingPreset: 'meeting',
      omitMeetingDialogue: true,
      expectAsyncMeetingDialogue: false,
      onCloudSummaryReady: undefined,
    },
    ctx,
  );

  if (!pass1.ok) {
    return pass1;
  }

  if (request.abortSignal?.aborted) {
    return {
      ok: false,
      provider: 'local',
      mode: ctx.aiExecutionMode,
      error: AI_REQUEST_CANCELLED,
    };
  }

  try {
    await request.onCloudSummaryReady?.(pass1.result);
  } catch {
    return {
      ok: false,
      provider: 'local',
      mode: ctx.aiExecutionMode,
      error: i18n.t('ai.privateModeGenericError'),
    };
  }

  if (request.abortSignal?.aborted) {
    return {
      ok: false,
      provider: 'local',
      mode: ctx.aiExecutionMode,
      error: AI_REQUEST_CANCELLED,
    };
  }

  const dialogueResult = await runLocalMeetingDialogue(
    {
      transcript: request.transcript,
      transcriptSegments: request.transcriptSegments,
      phase1: pass1.result,
      taskExtractionHint: request.taskExtractionHint,
      onLocalGenerationProgress: request.onLocalGenerationProgress,
      abortSignal: request.abortSignal,
    },
    ctx,
  );

  if (request.abortSignal?.aborted) {
    return {
      ok: false,
      provider: 'local',
      mode: ctx.aiExecutionMode,
      error: AI_REQUEST_CANCELLED,
    };
  }

  if (!dialogueResult.ok) {
    return {
      ok: true,
      provider: 'local',
      mode: ctx.aiExecutionMode,
      result: pass1.result,
      meetingDialogueStatus: 'failed',
    };
  }

  const md = dialogueResult.meetingDialogueMarkdown.trim();
  return {
    ok: true,
    provider: 'local',
    mode: ctx.aiExecutionMode,
    result: {
      ...pass1.result,
      ...(md ? { meetingDialogueMarkdown: md } : {}),
    },
    meetingDialogueStatus: md ? 'done' : 'skipped',
  };
}

export const AIOrchestrator = {
  async runSummaryTasks(
    request: SummaryTaskRequest,
    ctx: AiExecutionContext,
  ): Promise<SummaryTaskResult> {
    const guardResult = guardPrivateMode(request, ctx);
    if (guardResult) return guardResult;

    if (
      ctx.aiExecutionMode === 'private_experimental' &&
      ctx.privateAiProvider === 'custom_openai'
    ) {
      return runPrivateRemoteSummaryTasks(request, ctx);
    }

    if (ctx.aiExecutionMode === 'private_experimental') {
      return runPrivateSummaryTasks(request, ctx);
    }

    return runCloudSummaryTasks(request, ctx);
  },

  async runAsk(request: AskRequest, ctx: AiExecutionContext): Promise<AskTaskResult> {
    const guardResult = guardPrivateMode(request, ctx);
    if (guardResult) return guardResult;

    if (
      ctx.aiExecutionMode === 'private_experimental' &&
      ctx.privateAiProvider === 'custom_openai'
    ) {
      return runPrivateRemoteAsk(request, ctx);
    }

    if (ctx.aiExecutionMode === 'private_experimental') {
      return runLocalAsk(request, ctx);
    }

    return runCloudAsk(request, ctx);
  },

  async runInboxAsk(request: InboxAskRequest, ctx: AiExecutionContext): Promise<InboxAskTaskResult> {
    if (ctx.aiExecutionMode === 'private_experimental' && ctx.privateAiProvider !== 'custom_openai') {
      return {
        ok: false,
        provider: 'local',
        mode: ctx.aiExecutionMode,
        error: i18n.t('inboxAsk.privateDeviceUnavailable'),
      };
    }

    if (
      ctx.aiExecutionMode === 'private_experimental' &&
      ctx.privateAiProvider === 'custom_openai'
    ) {
      return runPrivateRemoteInboxAsk(request, ctx);
    }

    return runCloudInboxAsk(request, ctx);
  },
};
