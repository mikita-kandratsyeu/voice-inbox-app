import { i18n } from '@/shared/lib';
import { nitroFetch } from '@/shared/lib/fetch';
import { isRecord, isString } from '@/shared/lib/type-guards';

import { AI_REQUEST_CANCELLED } from '../ai-api/abort';
import type { AiProcessingResult } from '../ai-api/aiApi';
import {
  LOCAL_GEN_ASK,
  LOCAL_GEN_MEETING_DIALOGUE,
  LOCAL_GEN_SUMMARY,
  STRICT_JSON_TAIL,
} from './local-provider/localAiConstants';
import { parseJsonObjectWithFallbacks, parseLocalAskResponse } from './local-provider/localAiJson';
import { mapLocalError } from './local-provider/localAiMapError';
import {
  buildMeetingDialogueSystemPrompt,
  buildMeetingDialogueUserContent,
  type LocalMeetingDialogueRequest,
  type LocalMeetingDialogueResult,
} from './local-provider/localAiMeetingDialogue';
import { tryBuildSummaryFromModelRaw } from './local-provider/localAiSummaryParse';
import {
  getLocalReferenceDateIsoLocal,
  prepareTranscriptForLocalLlm,
} from './local-provider/localAiTranscript';
import {
  resolvePrivateRemoteAskMaxTokens,
  resolvePrivateRemoteJsonRepairMaxTokens,
  resolvePrivateRemoteMeetingDialogueMaxTokens,
  resolvePrivateRemoteSummaryMaxTokens,
} from './private-remote/privateRemoteConstants';
import {
  buildPrivateRemoteJsonSchemaResponseFormat,
  type PrivateRemoteStructuredSchemaKind,
} from './private-remote/privateRemoteResponseFormat';
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

function extractTextFromUnknown(value: unknown): string {
  if (isString(value)) return value;
  if (!isRecord(value) && !Array.isArray(value)) return '';

  if (Array.isArray(value)) {
    return value
      .map((item) => extractTextFromUnknown(item))
      .filter((item) => item.trim().length > 0)
      .join('\n')
      .trim();
  }

  const record = value as Record<string, unknown>;
  const directCandidates = ['text', 'content', 'value', 'output_text'] as const;
  for (const key of directCandidates) {
    const next = record[key];
    const text = extractTextFromUnknown(next);
    if (text.trim().length > 0) return text.trim();
  }

  return '';
}

type RemoteCompletionOutput = {
  content: string;
  reasoning?: string;
  model?: string;
  tokenUsage?: { prompt: number; completion: number };
};

type RepairKind = 'summary' | 'meeting_dialogue';

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
  if (baseUrl.endsWith('/openai') || baseUrl.endsWith('/v1')) {
    return `${baseUrl}/chat/completions`;
  }
  return `${baseUrl}/v1/chat/completions`;
}

function resolveRemoteModelsUrl(rawBaseUrl: string): string | null {
  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  if (!baseUrl) return null;
  if (baseUrl.endsWith('/openai') || baseUrl.endsWith('/v1')) {
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
    .map((item) => (isString(item?.id) ? item.id.trim() : ''))
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
  const firstChoice = response.choices?.[0];
  const content = firstChoice?.message?.content;
  const messageContentText = extractTextFromUnknown(content);
  if (messageContentText) return messageContentText;
  if (
    firstChoice?.message &&
    isRecord(firstChoice.message) &&
    'reasoning_content' in firstChoice.message
  ) {
    const reasoning = (firstChoice.message as { reasoning_content?: unknown }).reasoning_content;
    if (isString(reasoning) && reasoning.trim().length > 0) {
      return reasoning.trim();
    }
  }
  if (firstChoice && 'text' in firstChoice && isString((firstChoice as { text?: unknown }).text)) {
    return ((firstChoice as { text: string }).text ?? '').trim();
  }
  return '';
}

function extractHttpErrorMessage(bodyText: string): string {
  const trimmed = bodyText.trim();
  if (!trimmed) return bodyText;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isRecord(parsed)) return bodyText;
    const errorField = parsed.error;
    if (isString(errorField)) return errorField;
    if (isRecord(errorField)) {
      const nested = errorField.message ?? errorField.msg;
      if (isString(nested)) return nested;
    }
    if (isString(parsed.message)) return parsed.message;
  } catch {
    /* plain text body */
  }
  return bodyText;
}

type RemoteStructuredFormatMode = 'plain' | 'json_object' | 'json_schema';
type RemoteFormatCapability = 'unknown' | RemoteStructuredFormatMode;

const remoteFormatCapabilityByBaseUrl = new Map<string, RemoteFormatCapability>();

/** @internal test helper */
export function resetPrivateRemoteFormatCapabilityCacheForTests(): void {
  remoteFormatCapabilityByBaseUrl.clear();
}

function remoteBaseUrlKey(raw: string): string {
  return normalizeBaseUrl(raw)?.toLowerCase() ?? raw.trim().toLowerCase();
}

/** Server rejected the requested `response_format` — try the next mode in the ladder. */
function isStructuredFormatRejected(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (/json_object|json_schema/.test(msg)) {
    return true;
  }
  if (/response_format/.test(msg)) {
    return (
      /not supported|unsupported|invalid|unknown|unrecognized|must be|'text'|"text"/.test(msg) ||
      /response_format\.type/.test(msg)
    );
  }
  return false;
}

function structuredModesForBaseUrl(baseUrl: string): RemoteStructuredFormatMode[] {
  const cached = remoteFormatCapabilityByBaseUrl.get(remoteBaseUrlKey(baseUrl)) ?? 'unknown';
  if (cached === 'json_object') return ['json_object'];
  if (cached === 'json_schema') return ['json_schema'];
  if (cached === 'plain') return ['plain'];
  return ['json_schema', 'json_object', 'plain'];
}

function readMessageReasoning(response: OpenAiChatResponse): string {
  const firstChoice = response.choices?.[0];
  if (!firstChoice?.message || !isRecord(firstChoice.message)) {
    return '';
  }
  const reasoning = (firstChoice.message as { reasoning?: unknown; reasoning_content?: unknown })
    .reasoning;
  if (isString(reasoning)) return reasoning.trim();
  const reasoningContent = (
    firstChoice.message as { reasoning?: unknown; reasoning_content?: unknown }
  ).reasoning_content;
  if (isString(reasoningContent)) return reasoningContent.trim();
  return '';
}

type RemoteCompletionCallOptions = {
  /** When true and user setting allows, tries structured `response_format` (json_schema → json_object). */
  jsonObject?: boolean;
  schemaKind?: PrivateRemoteStructuredSchemaKind;
};

async function callRemoteCompletion(
  ctx: AiExecutionContext,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  maxTokens: number | null,
  temperature: number,
  abortSignal?: AbortSignal,
  options?: RemoteCompletionCallOptions,
): Promise<RemoteCompletionOutput> {
  const endpoint = resolveRemoteCompletionUrl(ctx.privateRemoteBaseUrl);
  if (!endpoint || !ctx.privateRemoteModel.trim()) {
    throw new Error(i18n.t('ai.privateModeRemoteConfigMissing'));
  }
  const headers = createRemoteHeaders(ctx.privateRemoteApiKey);
  const wantStructured = Boolean(options?.jsonObject && ctx.privateRemotePreferJsonObject);
  const schemaKind = options?.schemaKind ?? 'generic';
  const baseUrlKey = remoteBaseUrlKey(ctx.privateRemoteBaseUrl);

  const postOnce = async (
    formatMode: RemoteStructuredFormatMode,
    omitAbortSignal: boolean,
  ): Promise<RemoteCompletionOutput> => {
    const payload: Record<string, unknown> = {
      model: ctx.privateRemoteModel.trim(),
      messages,
      temperature,
      stream: false,
    };
    if (maxTokens != null) {
      payload.max_tokens = maxTokens;
    }
    if (formatMode === 'json_object') {
      payload.response_format = { type: 'json_object' };
    } else if (formatMode === 'json_schema') {
      payload.response_format = buildPrivateRemoteJsonSchemaResponseFormat(schemaKind);
    }

    const response = await nitroFetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: omitAbortSignal ? undefined : abortSignal,
    });
    if (!response.ok) {
      const bodyText = await response.text();
      const message = extractHttpErrorMessage(bodyText) || `HTTP ${response.status}`;
      throw new Error(message);
    }
    const json = (await response.json()) as OpenAiChatResponse;
    const content = readMessageContent(json);
    const messageReasoning = readMessageReasoning(json);
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
      ...(messageReasoning ? { reasoning: messageReasoning } : {}),
      ...(isString(json.model) && json.model.trim().length > 0 ? { model: json.model.trim() } : {}),
      ...(tokenUsage ? { tokenUsage } : {}),
    };
  };

  if (!wantStructured) {
    return postOnce('plain', false);
  }

  const modes = structuredModesForBaseUrl(ctx.privateRemoteBaseUrl);
  let lastErr: unknown;
  for (let i = 0; i < modes.length; i += 1) {
    const mode = modes[i]!;
    try {
      const result = await postOnce(mode, i > 0);
      remoteFormatCapabilityByBaseUrl.set(baseUrlKey, mode);
      return result;
    } catch (err) {
      lastErr = err;
      const hasNext = i < modes.length - 1;
      if (!hasNext || !isStructuredFormatRejected(err)) {
        throw err;
      }
    }
  }
  throw lastErr;
}

function parseMeetingDialogueMarkdownUnlimited(raw: string): string | null {
  try {
    const record = parseJsonObjectWithFallbacks(raw);
    const md = record.meetingDialogueMarkdown;
    if (!isString(md)) return null;
    const t = md.trim();
    if (!t) return '';
    return t;
  } catch {
    const tryExtractField = (text: string, field: string): string | null => {
      const quotedKey = new RegExp(`"${field}"\\s*:\\s*"`, 'i').exec(text);
      const bareKey = new RegExp(`${field}\\s*:\\s*"`, 'i').exec(text);
      const match = quotedKey ?? bareKey;
      if (!match) return null;

      let i = (match.index ?? 0) + match[0].length;
      let out = '';
      while (i < text.length) {
        const c = text[i]!;
        if (c === '\\') {
          if (i + 1 >= text.length) break;
          const n = text[i + 1]!;
          if (n === 'n') out += '\n';
          else if (n === 'r') out += '\r';
          else if (n === 't') out += '\t';
          else out += n;
          i += 2;
          continue;
        }
        if (c === '"') {
          return out.trim();
        }
        out += c;
        i += 1;
      }
      return out.trim() || null;
    };

    const fallback =
      tryExtractField(raw, 'meetingDialogueMarkdown') ??
      tryExtractField(raw, 'meeting_dialogue_markdown') ??
      tryExtractField(raw, 'meetingDialogue');
    return fallback;
  }
}

function normalizeRemoteJsonFields(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...input };

  const alias = (to: string, from: string) => {
    if (!(to in out) && from in out) out[to] = out[from];
  };

  alias('suggestedTitle', 'suggested_title');
  alias('keyPhrases', 'key_phrases');
  alias('nextSteps', 'next_steps');
  alias('meetingDialogueMarkdown', 'meeting_dialogue_markdown');
  alias('meetingDialogueMarkdown', 'meetingDialogue');

  if (Array.isArray(out.tasks)) {
    out.tasks = out.tasks.map((task) => {
      if (!isRecord(task)) return task;
      const item: Record<string, unknown> = { ...task };
      if (!('title' in item)) {
        if (isString(item.task)) item.title = item.task;
        else if (isString(item.name)) item.title = item.name;
      }
      if (!('deadline' in item)) {
        if (isString(item.due_date)) item.deadline = item.due_date;
        else if (isString(item.dueDate)) item.deadline = item.dueDate;
      }
      if (!('priority' in item)) {
        if (isString(item.priority_level)) item.priority = item.priority_level;
        else if (isString(item.priorityLevel)) item.priority = item.priorityLevel;
      }
      return item;
    });
  }

  return out;
}

function normalizeRawJsonIfPossible(raw: string): string | null {
  try {
    const parsed = parseJsonObjectWithFallbacks(raw);
    const normalized = normalizeRemoteJsonFields(parsed);
    return JSON.stringify(normalized);
  } catch {
    return null;
  }
}

async function runRemoteJsonRepairPass(
  ctx: AiExecutionContext,
  raw: string,
  kind: RepairKind,
  abortSignal?: AbortSignal,
): Promise<string | null> {
  const schemaHint =
    kind === 'summary'
      ? '{"summary":"...","suggestedTitle":"...","tasks":[{"title":"...","priority":"high|medium|low","deadline":null}],"tags":[],"classification":"personal|work|meeting|idea|other","keyPhrases":[],"nextSteps":[],"meetingDialogueMarkdown":"..."}'
      : '{"meetingDialogueMarkdown":"..."}';
  const repairSystemPrompt = [
    'You are a strict JSON repair assistant.',
    'Input may contain malformed JSON, prose, or mixed keys.',
    'Return exactly one valid JSON object only, no markdown/code fences/comments.',
    `Target schema: ${schemaHint}`,
    'Map snake_case keys to camelCase when needed.',
  ].join(' ');
  const repairUser = `Fix this response into one valid JSON object.\n\n${raw.slice(0, 12000)}`;
  try {
    const repaired = await callRemoteCompletion(
      ctx,
      [
        { role: 'system', content: repairSystemPrompt },
        { role: 'user', content: repairUser },
      ],
      resolvePrivateRemoteJsonRepairMaxTokens(),
      0,
      abortSignal,
      {
        jsonObject: true,
        schemaKind: kind === 'summary' ? 'summary' : 'meeting_dialogue',
      },
    );
    return repaired.content;
  } catch {
    return null;
  }
}

export type PrivateRemoteServerConfig = Pick<
  AiExecutionContext,
  'privateRemoteBaseUrl' | 'privateRemoteApiKey'
>;

export async function listPrivateRemoteModels(
  config: PrivateRemoteServerConfig,
): Promise<{ ok: true; models: string[] } | { ok: false; error: string }> {
  const modelsEndpoint = resolveRemoteModelsUrl(config.privateRemoteBaseUrl);
  if (!modelsEndpoint) {
    return { ok: false, error: i18n.t('ai.privateModeRemoteConfigMissing') };
  }

  try {
    const modelsResponse = await nitroFetch(modelsEndpoint, {
      method: 'GET',
      headers: createRemoteHeaders(config.privateRemoteApiKey),
    });
    if (isAuthFailureStatus(modelsResponse.status)) {
      return { ok: false, error: i18n.t('aiSettings.privateProvider.connectionStatus.authFailed') };
    }
    if (!modelsResponse.ok) {
      return {
        ok: false,
        error: `HTTP ${modelsResponse.status}`,
      };
    }
    const modelsJson = await readJsonSafe<OpenAiModelsResponse>(modelsResponse);
    if (!modelsJson) {
      return {
        ok: false,
        error: i18n.t('aiSettings.privateProvider.connectionStatus.invalidResponse'),
      };
    }
    const models = extractModelIds(modelsJson);
    if (models.length === 0) {
      return { ok: false, error: i18n.t('aiSettings.privateProvider.modelList.empty') };
    }
    return { ok: true, models };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : i18n.t('ai.privateModeGenericError'),
    };
  }
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
      const modelsResponse = await nitroFetch(modelsEndpoint, {
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

    const response = await nitroFetch(endpoint, {
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

async function runPrivateRemoteSummaryPass(
  request: SummaryTaskRequest,
  ctx: AiExecutionContext,
  opts: { includeMeetingDialogueField: boolean },
): Promise<
  | { ok: true; result: AiProcessingResult; remote: RemoteCompletionOutput }
  | { ok: false; error: string }
> {
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
    { pseudoDiarizationEligible: opts.includeMeetingDialogueField },
  );
  const userContent = request.transcript;
  const summaryMaxTokens = resolvePrivateRemoteSummaryMaxTokens(ctx.privateRemoteOutputBudget);
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
      {
        jsonObject: true,
        schemaKind: opts.includeMeetingDialogueField ? 'summary_with_meeting' : 'summary',
      },
    );

  let remote = await runOnce(userContent);
  const normalizedFirst = normalizeRawJsonIfPossible(remote.content);
  let outcome = tryBuildSummaryFromModelRaw(normalizedFirst ?? remote.content, {
    includePseudoDiarization: opts.includeMeetingDialogueField,
  });
  if (!outcome.ok) {
    remote = await runOnce(`${userContent}\n\n${STRICT_JSON_TAIL}`);
    const normalizedRetry = normalizeRawJsonIfPossible(remote.content);
    outcome = tryBuildSummaryFromModelRaw(normalizedRetry ?? remote.content, {
      includePseudoDiarization: opts.includeMeetingDialogueField,
    });
  }
  if (!outcome.ok) {
    const repaired = await runRemoteJsonRepairPass(
      ctx,
      remote.content,
      'summary',
      request.abortSignal,
    );
    if (repaired) {
      const normalizedRepaired = normalizeRawJsonIfPossible(repaired);
      outcome = tryBuildSummaryFromModelRaw(normalizedRepaired ?? repaired, {
        includePseudoDiarization: opts.includeMeetingDialogueField,
      });
    }
  }
  if (!outcome.ok) {
    return { ok: false, error: i18n.t('ai.privateModeParseFailed') };
  }
  return { ok: true, result: outcome.result, remote };
}

export async function runPrivateRemoteMeetingDialogue(
  request: LocalMeetingDialogueRequest,
  ctx: AiExecutionContext,
): Promise<LocalMeetingDialogueResult> {
  try {
    if (request.abortSignal?.aborted) {
      return { ok: false, error: 'cancelled' };
    }
    const systemPrompt = buildMeetingDialogueSystemPrompt(ctx);
    // Mimic local behaviour: deterministic prefix+suffix trimming by private tier.
    const trimmedTranscript = prepareTranscriptForLocalLlm(
      request.transcript,
      ctx.privateCapabilityTier,
    );
    const userContent = buildMeetingDialogueUserContent(
      trimmedTranscript,
      request.phase1,
      request.transcriptSegments,
      request.taskExtractionHint,
    );
    const maxTokensBudget = resolvePrivateRemoteMeetingDialogueMaxTokens(
      ctx.privateRemoteOutputBudget,
    );
    const maxTokensSent = maxTokensBudget == null ? null : Math.max(4096, maxTokensBudget);
    const runOnce = (user: string) =>
      callRemoteCompletion(
        ctx,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: user },
        ],
        maxTokensSent,
        LOCAL_GEN_MEETING_DIALOGUE.temperature,
        request.abortSignal,
        { jsonObject: true, schemaKind: 'meeting_dialogue' },
      );

    let remote = await runOnce(userContent);
    let markdown = parseMeetingDialogueMarkdownUnlimited(remote.content);
    if (markdown === null) {
      remote = await runOnce(`${userContent}\n\n${STRICT_JSON_TAIL}`);
      markdown = parseMeetingDialogueMarkdownUnlimited(remote.content);
    }
    if (markdown === null) {
      const repaired = await runRemoteJsonRepairPass(
        ctx,
        remote.content,
        'meeting_dialogue',
        request.abortSignal,
      );
      if (repaired) {
        markdown = parseMeetingDialogueMarkdownUnlimited(repaired);
      }
    }
    if (markdown === null) {
      throw new Error(i18n.t('ai.privateModeParseFailed'));
    }
    return { ok: true, meetingDialogueMarkdown: markdown };
  } catch (err) {
    return { ok: false, error: mapLocalError(err) };
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

    if (request.expectAsyncMeetingDialogue) {
      const pass1 = await runPrivateRemoteSummaryPass(request, ctx, {
        includeMeetingDialogueField: false,
      });
      if (!pass1.ok) {
        throw new Error(pass1.error);
      }
      if (request.abortSignal?.aborted) {
        return {
          ok: false,
          provider: 'private_remote',
          mode: ctx.aiExecutionMode,
          error: AI_REQUEST_CANCELLED,
        };
      }
      try {
        await request.onCloudSummaryReady?.(pass1.result);
      } catch {
        return {
          ok: false,
          provider: 'private_remote',
          mode: ctx.aiExecutionMode,
          error: i18n.t('ai.privateModeGenericError'),
        };
      }
      if (request.abortSignal?.aborted) {
        return {
          ok: false,
          provider: 'private_remote',
          mode: ctx.aiExecutionMode,
          error: AI_REQUEST_CANCELLED,
        };
      }

      const dialogueResult = await runPrivateRemoteMeetingDialogue(
        {
          transcript: request.transcript,
          transcriptSegments: request.transcriptSegments,
          phase1: pass1.result,
          taskExtractionHint: request.taskExtractionHint,
          abortSignal: request.abortSignal,
        },
        ctx,
      );

      if (request.abortSignal?.aborted) {
        return {
          ok: false,
          provider: 'private_remote',
          mode: ctx.aiExecutionMode,
          error: AI_REQUEST_CANCELLED,
        };
      }

      if (!dialogueResult.ok) {
        return {
          ok: true,
          provider: 'private_remote',
          mode: ctx.aiExecutionMode,
          result: pass1.result,
          meetingDialogueStatus: 'failed',
        };
      }

      const md = dialogueResult.meetingDialogueMarkdown.trim();
      const enrichedPass1 = {
        ...pass1.result,
        ...(pass1.result.reasoning?.trim()
          ? {}
          : pass1.remote.reasoning?.trim()
            ? { reasoning: pass1.remote.reasoning.trim() }
            : {}),
        ...(pass1.remote.model ? { model: pass1.remote.model } : {}),
        ...(pass1.remote.tokenUsage ? { tokenUsage: pass1.remote.tokenUsage } : {}),
      };
      return {
        ok: true,
        provider: 'private_remote',
        mode: ctx.aiExecutionMode,
        result: {
          ...enrichedPass1,
          ...(md ? { meetingDialogueMarkdown: md } : {}),
        },
        meetingDialogueStatus: md ? 'done' : 'skipped',
      };
    }

    const singlePass = await runPrivateRemoteSummaryPass(request, ctx, {
      includeMeetingDialogueField: false,
    });
    if (!singlePass.ok) {
      throw new Error(singlePass.error);
    }
    if (request.abortSignal?.aborted) {
      return {
        ok: false,
        provider: 'private_remote',
        mode: ctx.aiExecutionMode,
        error: AI_REQUEST_CANCELLED,
      };
    }
    const enrichedResult = {
      ...singlePass.result,
      ...(singlePass.result.reasoning?.trim()
        ? {}
        : singlePass.remote.reasoning?.trim()
          ? { reasoning: singlePass.remote.reasoning.trim() }
          : {}),
      ...(singlePass.remote.model ? { model: singlePass.remote.model } : {}),
      ...(singlePass.remote.tokenUsage ? { tokenUsage: singlePass.remote.tokenUsage } : {}),
    };
    return {
      ok: true,
      provider: 'private_remote',
      mode: ctx.aiExecutionMode,
      result: enrichedResult,
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
    const askMaxTokens = resolvePrivateRemoteAskMaxTokens(ctx.privateRemoteOutputBudget);
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
        { jsonObject: true, schemaKind: 'ask' },
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
