import { i18n } from '@/shared/lib';

import { AI_REQUEST_CANCELLED } from '../ai-api/abort';
import {
  LOCAL_GEN_ASK,
  LOCAL_GEN_SUMMARY,
  STRICT_JSON_TAIL,
  resolvePrivateAskMaxTokens,
  resolvePrivateSummaryMaxTokens,
} from './local-provider/localAiConstants';
import { parseLocalAskResponse } from './local-provider/localAiJson';
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
import { mapLocalError } from './local-provider/localAiMapError';
import type { AskRequest, AskTaskResult, SummaryTaskRequest, SummaryTaskResult } from './types';
import type { AiExecutionContext } from './types';

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
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
): Promise<string> {
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
  return content;
}

export async function testPrivateRemoteConnection(
  config: Pick<AiExecutionContext, 'privateRemoteBaseUrl' | 'privateRemoteApiKey' | 'privateRemoteModel'>,
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
      return { ok: false, provider: 'private_remote', mode: ctx.aiExecutionMode, error: AI_REQUEST_CANCELLED };
    }
    const transcript = prepareTranscriptForLocalLlm(request.transcript, ctx.privateCapabilityTier);
    const includeMeetingDialogueField = request.expectAsyncMeetingDialogue === true;
    const systemPrompt = buildLocalSummarySystemPrompt(getLocalReferenceDateIsoLocal(), {
      includePseudoDiarization: includeMeetingDialogueField,
      aiOutputLanguage: ctx.aiOutputLanguage,
    });
    const userContent = buildLocalSummaryUserContent(
      transcript,
      ctx,
      request.existingTaskTexts,
      request.taskExtractionHint,
      request.processingPreset,
      request.recordingMarks,
      { includeMeetingDialogueField },
    );
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

    let raw = await runOnce(userContent);
    let outcome = tryBuildSummaryFromModelRaw(raw, { includePseudoDiarization: includeMeetingDialogueField });
    if (!outcome.ok) {
      raw = await runOnce(`${userContent}\n\n${STRICT_JSON_TAIL}`);
      outcome = tryBuildSummaryFromModelRaw(raw, { includePseudoDiarization: includeMeetingDialogueField });
    }
    if (!outcome.ok) {
      throw new Error(i18n.t('ai.privateModeParseFailed'));
    }
    if (request.abortSignal?.aborted) {
      return { ok: false, provider: 'private_remote', mode: ctx.aiExecutionMode, error: AI_REQUEST_CANCELLED };
    }
    const meetingDialogueStatus =
      request.expectAsyncMeetingDialogue === true
        ? outcome.result.meetingDialogueMarkdown?.trim()
          ? 'done'
          : 'skipped'
        : undefined;
    return {
      ok: true,
      provider: 'private_remote',
      mode: ctx.aiExecutionMode,
      result: outcome.result,
      ...(meetingDialogueStatus ? { meetingDialogueStatus } : {}),
    };
  } catch (err) {
    if (request.abortSignal?.aborted) {
      return { ok: false, provider: 'private_remote', mode: ctx.aiExecutionMode, error: AI_REQUEST_CANCELLED };
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
      return { ok: false, provider: 'private_remote', mode: ctx.aiExecutionMode, error: AI_REQUEST_CANCELLED };
    }
    const transcript = prepareTranscriptForLocalLlm(request.transcript, ctx.privateCapabilityTier);
    const userContent = buildLocalAskUserContent(request, transcript);
    const askSystemPrompt = buildLocalAskSystemPrompt();
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

    let raw = await runOnce(userContent);
    let answer = parseLocalAskResponse(raw);
    if (!answer) {
      raw = await runOnce(`${userContent}\n\n${STRICT_JSON_TAIL}`);
      answer = parseLocalAskResponse(raw);
    }
    if (!answer) {
      throw new Error(i18n.t('ai.privateModeEmptyAnswer'));
    }
    return {
      ok: true,
      provider: 'private_remote',
      mode: ctx.aiExecutionMode,
      result: { answer },
    };
  } catch (err) {
    if (request.abortSignal?.aborted) {
      return { ok: false, provider: 'private_remote', mode: ctx.aiExecutionMode, error: AI_REQUEST_CANCELLED };
    }
    return {
      ok: false,
      provider: 'private_remote',
      mode: ctx.aiExecutionMode,
      error: mapLocalError(err),
    };
  }
}
