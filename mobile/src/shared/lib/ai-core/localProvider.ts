import {
  LOCAL_GEN_ASK,
  LOCAL_GEN_SUMMARY,
  resolvePrivateAskMaxTokens,
  resolvePrivateSummaryMaxTokens,
  STRICT_JSON_TAIL,
} from './local-provider/localAiConstants';
import { LocalAiError } from './local-provider/localAiErrors';
import { parseLocalAskResponse } from './local-provider/localAiJson';
import { mapLocalError } from './local-provider/localAiMapError';
import {
  buildLocalAskSystemPrompt,
  buildLocalAskUserContent,
  buildLocalSummarySystemPrompt,
  buildLocalSummaryUserContent,
} from './local-provider/localAiPrompts';
import { tryBuildSummaryFromModelRaw } from './local-provider/localAiSummaryParse';
import {
  getLocalReferenceDateIsoLocal,
  prepareTranscriptForLocalLlm,
} from './local-provider/localAiTranscript';
import { localPromptFitsLlmContext } from './localLlmBudget';
import { getLocalLlmAskTemperature, getLocalLlmSummaryTemperature } from './localLlmModelProfiles';
import {
  completeLocalChat,
  type LocalLlmCompletionIntent,
  type LocalLlmSessionProgressEvent,
} from './localLlmSession';
import type {
  AiExecutionContext,
  AskRequest,
  AskTaskResult,
  SummaryTaskRequest,
  SummaryTaskResult,
} from './types';

export { LocalAiError, type LocalAiErrorCode } from './local-provider/localAiErrors';
export {
  extractBalancedJsonObject,
  extractJsonObjectLoose,
  parseJsonObjectWithFallbacks,
  parseLocalAskResponse,
  repairCommonJsonIssues,
} from './local-provider/localAiJson';
export { parseLocalSummaryResponse } from './local-provider/localAiSummaryParse';
export {
  normalizeClassification,
  normalizeDeadline,
  sanitizeStringArray,
  sanitizeSummaryPayload,
  sanitizeTasks,
} from './local-provider/localAiSummarySanitize';
export {
  getLocalReferenceDateIsoLocal,
  getTranscriptCharLimit,
  truncateTranscriptSmart,
} from './local-provider/localAiTranscript';

async function generateWithLocalLlm(
  modelId: AiExecutionContext['selectedLocalAiModel'],
  messages: { role: 'system' | 'user'; content: string }[],
  options?: {
    maxTokens?: number;
    temperature?: number;
    intent?: LocalLlmCompletionIntent;
    onLlmSessionProgress?: (event: LocalLlmSessionProgressEvent) => void;
  },
): Promise<string> {
  const maxTokens = options?.maxTokens ?? 512;
  const combined = messages.map((m) => m.content).join('\n\n');
  if (!localPromptFitsLlmContext(combined, maxTokens, modelId)) {
    throw new LocalAiError(
      'transcript_too_long',
      'Local prompt too long for current model context',
    );
  }

  return completeLocalChat(
    modelId,
    messages.map((m) => ({ role: m.role, content: m.content })),
    {
      maxTokens,
      temperature: options?.temperature ?? 0.2,
      intent: options?.intent ?? 'chat',
      onLlmSessionProgress: options?.onLlmSessionProgress,
    },
  );
}

/**
 * Returns a session-progress bridge that translates raw llama.rn tick events into
 * typed `AiLocalGenerationProgressEvent` values forwarded to the caller's callback.
 * Also exposes `reset()` so the token counter can be cleared between retries.
 */
function makeBridgeProgress(
  onProgress: SummaryTaskRequest['onLocalGenerationProgress'],
  nPredictBudget: number,
): { bridge: (event: LocalLlmSessionProgressEvent) => void; reset: () => void } {
  let sessionTokens = 0;

  return {
    reset() {
      sessionTokens = 0;
    },
    bridge(event: LocalLlmSessionProgressEvent) {
      if (!onProgress) return;
      if (event.kind === 'completion_tick') {
        sessionTokens += 1;
        onProgress({
          kind: 'completion_token',
          tokenIndex: sessionTokens,
          nPredictBudget,
        });
      } else {
        onProgress(event);
      }
    },
  };
}

export async function runLocalSummaryTasks(
  request: SummaryTaskRequest,
  ctx: AiExecutionContext,
): Promise<SummaryTaskResult> {
  try {
    const candidateTranscript = prepareTranscriptForLocalLlm(
      request.transcript,
      ctx.privateCapabilityTier,
    );

    const referenceDate = getLocalReferenceDateIsoLocal();
    const isMeetingPreset = request.processingPreset === 'meeting';
    const includeDialogueInPass = isMeetingPreset && request.omitMeetingDialogue !== true;
    const systemPrompt = buildLocalSummarySystemPrompt(referenceDate, {
      includePseudoDiarization: includeDialogueInPass,
      aiOutputLanguage: ctx.aiOutputLanguage,
    });
    const userContent = buildLocalSummaryUserContent(
      candidateTranscript,
      ctx,
      request.existingTaskTexts,
      request.taskExtractionHint,
      request.processingPreset,
      request.meetingSummaryTemplate,
      request.recordingMarks,
      { includeMeetingDialogueField: includeDialogueInPass },
    );

    const summaryMaxTokens = resolvePrivateSummaryMaxTokens(ctx.privateLocalLlmBudget);
    const progressBridge = makeBridgeProgress(
      request.onLocalGenerationProgress,
      Math.max(1, summaryMaxTokens * 2),
    );

    const runOnce = (user: string) => {
      progressBridge.reset();
      return generateWithLocalLlm(
        ctx.selectedLocalAiModel,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: user },
        ],
        {
          maxTokens: summaryMaxTokens,
          temperature: getLocalLlmSummaryTemperature(
            ctx.selectedLocalAiModel,
            LOCAL_GEN_SUMMARY.temperature,
          ),
          intent: 'json',
          onLlmSessionProgress: request.onLocalGenerationProgress
            ? progressBridge.bridge
            : undefined,
        },
      );
    };

    const parseOpts = { includePseudoDiarization: includeDialogueInPass };

    let raw = await runOnce(userContent);
    let outcome = tryBuildSummaryFromModelRaw(raw, parseOpts);

    if (!outcome.ok) {
      // On retry append the strictness reminder to the user message — SLMs respond
      // better to formatting constraints in the user turn than repeated system text.
      raw = await runOnce(`${userContent}\n\n${STRICT_JSON_TAIL}`);
      outcome = tryBuildSummaryFromModelRaw(raw, parseOpts);
    }

    if (!outcome.ok) {
      throw new LocalAiError(
        outcome.reason === 'parse_failed' ? 'parse_failed' : 'empty_summary',
        outcome.reason === 'parse_failed'
          ? 'Invalid local summary response'
          : 'Local summary is empty',
      );
    }

    return {
      ok: true,
      provider: 'local',
      mode: ctx.aiExecutionMode,
      result: { ...outcome.result, model: ctx.selectedLocalAiModel },
    };
  } catch (err) {
    return {
      ok: false,
      provider: 'local',
      mode: ctx.aiExecutionMode,
      error: mapLocalError(err),
    };
  }
}

export async function runLocalAsk(
  request: AskRequest,
  ctx: AiExecutionContext,
): Promise<AskTaskResult> {
  try {
    const transcript = prepareTranscriptForLocalLlm(request.transcript, ctx.privateCapabilityTier);
    const askSystemPrompt = buildLocalAskSystemPrompt();
    const userContent = buildLocalAskUserContent(request, transcript);

    const askMaxTokens = resolvePrivateAskMaxTokens(ctx.privateLocalLlmBudget);
    const progressBridge = makeBridgeProgress(
      request.onLocalGenerationProgress,
      Math.max(1, askMaxTokens * 2),
    );

    const runOnce = (user: string) => {
      progressBridge.reset();
      return generateWithLocalLlm(
        ctx.selectedLocalAiModel,
        [
          { role: 'system', content: askSystemPrompt },
          { role: 'user', content: user },
        ],
        {
          maxTokens: askMaxTokens,
          temperature: getLocalLlmAskTemperature(
            ctx.selectedLocalAiModel,
            LOCAL_GEN_ASK.temperature,
          ),
          intent: 'json',
          onLlmSessionProgress: request.onLocalGenerationProgress
            ? progressBridge.bridge
            : undefined,
        },
      );
    };

    let raw = await runOnce(userContent);
    let answer = parseLocalAskResponse(raw);

    if (answer === null) {
      raw = await runOnce(`${userContent}\n\n${STRICT_JSON_TAIL}`);
      answer = parseLocalAskResponse(raw);
    }

    if (!answer) {
      throw new LocalAiError('empty_answer', 'Local answer is empty');
    }

    return {
      ok: true,
      provider: 'local',
      mode: ctx.aiExecutionMode,
      result: { answer },
    };
  } catch (err) {
    return {
      ok: false,
      provider: 'local',
      mode: ctx.aiExecutionMode,
      error: mapLocalError(err),
    };
  }
}
