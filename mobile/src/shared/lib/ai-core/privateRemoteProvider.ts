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

type OpenAiModelsResponse = {
  data?: Array<{ id?: string }>;
};

type RemoteCompletionOutput = {
  content: string;
  model?: string;
  tokenUsage?: { prompt: number; completion: number };
};

export type PrivateRemoteConnectionFailureReason =
  | 'server_unreachable'
  | 'auth_failed'
  | 'model_not_found'
  | 'invalid_response';

export type PrivateRemoteConnectionTestResult =
  | { ok: true; models: string[] }
  | { ok: false; reason: PrivateRemoteConnectionFailureReason; error?: string; models?: string[] };

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

function resolveRemoteModelsUrl(rawBaseUrl: string): string | null {
  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  if (!baseUrl) return null;
  if (baseUrl.endsWith('/v1')) {
    return `${baseUrl}/models`;
  }
  return `${baseUrl}/v1/models`;
}

function createRemoteHeaders(apiKeyRaw: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const apiKey = apiKeyRaw.trim();
  if (apiKey.length > 0) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

function isAuthFailureStatus(status: number): boolean {
  return status === 401 || status === 403;
}

function extractModelIds(json: OpenAiModelsResponse): string[] {
  if (!Array.isArray(json.data)) return [];
  return json.data
    .map((item) => (typeof item?.id === 'string' ? item.id.trim() : ''))
    .filter((id) => id.length > 0);
}

async function readJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
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
): Promise<PrivateRemoteConnectionTestResult> {
  try {
    const endpoint = resolveRemoteCompletionUrl(config.privateRemoteBaseUrl);
    const modelsEndpoint = resolveRemoteModelsUrl(config.privateRemoteBaseUrl);
    const model = config.privateRemoteModel.trim();
    if (!endpoint || !modelsEndpoint || !model) {
      return {
        ok: false,
        reason: 'invalid_response',
        error: i18n.t('ai.privateModeRemoteConfigMissing'),
      };
    }
    const headers = createRemoteHeaders(config.privateRemoteApiKey);

    let modelIds: string[] = [];
    try {
      const modelsResponse = await fetch(modelsEndpoint, {
        method: 'GET',
        headers,
      });
      if (isAuthFailureStatus(modelsResponse.status)) {
        return { ok: false, reason: 'auth_failed' };
      }
      if (!modelsResponse.ok) {
        return {
          ok: false,
          reason: 'server_unreachable',
          error: `HTTP ${modelsResponse.status}`,
        };
      }
      const modelsJson = await readJsonSafe<OpenAiModelsResponse>(modelsResponse);
      if (!modelsJson) {
        return { ok: false, reason: 'invalid_response' };
      }
      modelIds = extractModelIds(modelsJson);
      if (modelIds.length > 0 && !modelIds.includes(model)) {
        return { ok: false, reason: 'model_not_found', models: modelIds };
      }
    } catch (err) {
      return {
        ok: false,
        reason: 'server_unreachable',
        error: err instanceof Error ? err.message : i18n.t('ai.privateModeGenericError'),
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Reply with plain text "pong".' },
          { role: 'user', content: 'ping' },
        ],
        temperature: 0,
        max_tokens: 32,
        stream: false,
      }),
    });
    if (isAuthFailureStatus(response.status)) {
      return { ok: false, reason: 'auth_failed' };
    }
    if (!response.ok) {
      return {
        ok: false,
        reason: 'server_unreachable',
        error: `HTTP ${response.status}`,
        ...(modelIds.length > 0 ? { models: modelIds } : {}),
      };
    }
    const json = await readJsonSafe<OpenAiChatResponse>(response);
    if (!json) {
      return {
        ok: false,
        reason: 'invalid_response',
        ...(modelIds.length > 0 ? { models: modelIds } : {}),
      };
    }
    const hasMessageObject = json.choices?.[0]?.message != null;
    if (!hasMessageObject) {
      return {
        ok: false,
        reason: 'invalid_response',
        ...(modelIds.length > 0 ? { models: modelIds } : {}),
      };
    }
    return { ok: true, models: modelIds };
  } catch (err) {
    return {
      ok: false,
      reason: 'server_unreachable',
      error: err instanceof Error ? err.message : i18n.t('ai.privateModeGenericError'),
    };
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
