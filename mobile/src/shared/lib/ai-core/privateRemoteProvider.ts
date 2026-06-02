import { i18n } from '@/shared/lib';

import { AI_REQUEST_CANCELLED } from '../ai-api/abort';
import {
  LOCAL_GEN_ASK,
  LOCAL_GEN_SUMMARY,
  resolvePrivateAskMaxTokens,
  resolvePrivateSummaryMaxTokens,
  STRICT_JSON_TAIL,
} from './local-provider/localAiConstants';
import { parseLocalAskResponse } from './local-provider/localAiJson';
import { mapLocalError } from './local-provider/localAiMapError';
import { tryBuildSummaryFromModelRaw } from './local-provider/localAiSummaryParse';
import { getLocalReferenceDateIsoLocal } from './local-provider/localAiTranscript';
import {
  buildWebParityAiProcessingPrompt,
  buildWebParityAskUserMessageContent,
  WEB_PARITY_ASK_SYSTEM_PROMPT,
} from './private-remote/webPromptParity';
import type { AskRequest, AskTaskResult, SummaryTaskRequest, SummaryTaskResult } from './types';
import type { AiExecutionContext } from './types';

type OpenAiChatResponse = {
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
};

type RemoteCompletionOutput = {
  content: string;
  model?: string;
  tokenUsage?: { prompt: number; completion: number };
};

function normalizeBaseUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

function resolveRemoteCompletionUrl(rawBaseUrl: string): string | null {
  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  if (!baseUrl) return null;
  if (baseUrl.endsWith('/v1')) {
    return `${baseUrl}/chat/completions`;
  }
  return `${baseUrl}/v1/chat/completions`;
}

function readMessageContent(response: OpenAiChatResponse): string {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((item) => (item?.type === 'text' && item.text ? item.text : ''))
      .join('\n')
      .trim();
  }
  return '';
}

async function callRemoteCompletion(
  ctx: AiExecutionContext,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  maxTokens: number,
  temperature: number,
  abortSignal?: AbortSignal,
): Promise<RemoteCompletionOutput> {
  const endpoint = resolveRemoteCompletionUrl(ctx.privateRemoteBaseUrl);
  if (!endpoint || !ctx.privateRemoteModel.trim()) {
    throw new Error(i18n.t('ai.privateModeRemoteConfigMissing'));
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const apiKey = ctx.privateRemoteApiKey.trim();
  if (apiKey.length > 0) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: ctx.privateRemoteModel.trim(),
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
    signal: abortSignal,
  });
  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(bodyText || `HTTP ${response.status}`);
  }
  const json = (await response.json()) as OpenAiChatResponse;
  const content = readMessageContent(json);
  if (!content) {
    throw new Error(i18n.t('ai.privateModeEmptyAnswer'));
  }
  const promptTokens = Number(json.usage?.prompt_tokens);
  const completionTokens = Number(json.usage?.completion_tokens);
  const tokenUsage =
    Number.isFinite(promptTokens) && Number.isFinite(completionTokens)
      ? {
          prompt: Math.max(0, Math.floor(promptTokens)),
          completion: Math.max(0, Math.floor(completionTokens)),
        }
      : undefined;
  return {
    content,
    ...(typeof json.model === 'string' && json.model.trim().length > 0
      ? { model: json.model.trim() }
      : {}),
    ...(tokenUsage ? { tokenUsage } : {}),
  };
}

export async function testPrivateRemoteConnection(
  config: Pick<
    AiExecutionContext,
    'privateRemoteBaseUrl' | 'privateRemoteApiKey' | 'privateRemoteModel'
  >,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fakeCtx = {
    privateRemoteBaseUrl: config.privateRemoteBaseUrl,
    privateRemoteApiKey: config.privateRemoteApiKey,
    privateRemoteModel: config.privateRemoteModel,
  } as AiExecutionContext;
  try {
    await callRemoteCompletion(
      fakeCtx,
      [
        { role: 'system', content: 'Reply with plain text "pong".' },
        { role: 'user', content: 'ping' },
      ],
      32,
      0,
    );
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : i18n.t('ai.privateModeGenericError');
    return { ok: false, error };
  }
}

export async function runPrivateRemoteSummaryTasks(
  request: SummaryTaskRequest,
  ctx: AiExecutionContext,
): Promise<SummaryTaskResult> {
  try {
    if (request.abortSignal?.aborted) {
      return {
        ok: false,
        provider: 'private_remote',
        mode: ctx.aiExecutionMode,
        error: AI_REQUEST_CANCELLED,
      };
    }
    const transcript = request.transcript;
    const includeMeetingDialogueField = request.expectAsyncMeetingDialogue === true;
    const systemPrompt = buildWebParityAiProcessingPrompt(
      {
        summaryStyle: ctx.summaryStyle,
        taskStrictness: ctx.taskStrictness,
        outputLanguage: ctx.aiOutputLanguage,
        processingPreset: request.processingPreset,
        referenceDate: getLocalReferenceDateIsoLocal(),
        existingTaskTexts: request.existingTaskTexts,
        taskExtractionHint: request.taskExtractionHint,
        recordingMarks: request.recordingMarks,
      },
      { pseudoDiarizationEligible: includeMeetingDialogueField },
    );
    const userContent = transcript;
    const summaryMaxTokens = resolvePrivateSummaryMaxTokens(ctx.privateLocalLlmBudget);
    const runOnce = (user: string) =>
      callRemoteCompletion(
        ctx,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: user },
        ],
        summaryMaxTokens,
        LOCAL_GEN_SUMMARY.temperature,
        request.abortSignal,
      );

    let remote = await runOnce(userContent);
    let outcome = tryBuildSummaryFromModelRaw(remote.content, {
      includePseudoDiarization: includeMeetingDialogueField,
    });
    if (!outcome.ok) {
      remote = await runOnce(`${userContent}\n\n${STRICT_JSON_TAIL}`);
      outcome = tryBuildSummaryFromModelRaw(remote.content, {
        includePseudoDiarization: includeMeetingDialogueField,
      });
    }
    if (!outcome.ok) {
      throw new Error(i18n.t('ai.privateModeParseFailed'));
    }
    if (request.abortSignal?.aborted) {
      return {
        ok: false,
        provider: 'private_remote',
        mode: ctx.aiExecutionMode,
        error: AI_REQUEST_CANCELLED,
      };
    }
    const meetingDialogueStatus =
      request.expectAsyncMeetingDialogue === true
        ? outcome.result.meetingDialogueMarkdown?.trim()
          ? 'done'
          : 'skipped'
        : undefined;
    const enrichedResult = {
      ...outcome.result,
      ...(remote.model ? { model: remote.model } : {}),
      ...(remote.tokenUsage ? { tokenUsage: remote.tokenUsage } : {}),
    };
    return {
      ok: true,
      provider: 'private_remote',
      mode: ctx.aiExecutionMode,
      result: enrichedResult,
      ...(meetingDialogueStatus ? { meetingDialogueStatus } : {}),
    };
  } catch (err) {
    if (request.abortSignal?.aborted) {
      return {
        ok: false,
        provider: 'private_remote',
        mode: ctx.aiExecutionMode,
        error: AI_REQUEST_CANCELLED,
      };
    }
    return {
      ok: false,
      provider: 'private_remote',
      mode: ctx.aiExecutionMode,
      error: mapLocalError(err),
    };
  }
}

export async function runPrivateRemoteAsk(
  request: AskRequest,
  ctx: AiExecutionContext,
): Promise<AskTaskResult> {
  try {
    if (request.abortSignal?.aborted) {
      return {
        ok: false,
        provider: 'private_remote',
        mode: ctx.aiExecutionMode,
        error: AI_REQUEST_CANCELLED,
      };
    }
    const transcript = request.transcript;
    const userContent = buildWebParityAskUserMessageContent(
      transcript,
      request.question,
      request.summary,
      request.tasks,
      request.priorTurns,
      request.recordingMarks,
    );
    const askSystemPrompt = WEB_PARITY_ASK_SYSTEM_PROMPT;
    const askMaxTokens = resolvePrivateAskMaxTokens(ctx.privateLocalLlmBudget);
    const runOnce = (user: string) =>
      callRemoteCompletion(
        ctx,
        [
          { role: 'system', content: askSystemPrompt },
          { role: 'user', content: user },
        ],
        askMaxTokens,
        LOCAL_GEN_ASK.temperature,
        request.abortSignal,
      );

    let remote = await runOnce(userContent);
    let answer = parseLocalAskResponse(remote.content);
    if (!answer) {
      remote = await runOnce(`${userContent}\n\n${STRICT_JSON_TAIL}`);
      answer = parseLocalAskResponse(remote.content);
    }
    if (!answer) {
      throw new Error(i18n.t('ai.privateModeEmptyAnswer'));
    }
    return {
      ok: true,
      provider: 'private_remote',
      mode: ctx.aiExecutionMode,
      result: { answer, ...(remote.model ? { model: remote.model } : {}) },
    };
  } catch (err) {
    if (request.abortSignal?.aborted) {
      return {
        ok: false,
        provider: 'private_remote',
        mode: ctx.aiExecutionMode,
        error: AI_REQUEST_CANCELLED,
      };
    }
    return {
      ok: false,
      provider: 'private_remote',
      mode: ctx.aiExecutionMode,
      error: mapLocalError(err),
    };
  }
}
