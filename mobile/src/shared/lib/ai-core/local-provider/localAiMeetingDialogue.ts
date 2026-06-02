import type { AiProcessingResult } from '@/shared/lib/ai-api';
import { isString } from '@/shared/lib/type-guards';

import { localPromptFitsLlmContext } from '../localLlmBudget';
import { getLocalLlmSummaryTemperature } from '../localLlmModelProfiles';
import type { LocalLlmCompletionIntent, LocalLlmSessionProgressEvent } from '../localLlmSession';
import { completeLocalChat } from '../localLlmSession';
import type {
  AiExecutionContext,
  AiLocalGenerationProgressEvent,
  SummaryTaskTranscriptSegment,
} from '../types';
import {
  FIELD_LIMITS,
  LOCAL_GEN_MEETING_DIALOGUE,
  resolvePrivateMeetingDialogueMaxTokens,
  STRICT_JSON_TAIL,
} from './localAiConstants';
import { LocalAiError } from './localAiErrors';
import { parseJsonObjectWithFallbacks } from './localAiJson';
import { mapLocalError } from './localAiMapError';
import {
  LOCAL_MEETING_DIALOGUE_OUTPUT_LANGUAGE_HINT,
  LOCAL_MEETING_PSEUDO_BASE,
} from './localAiPrompts';
import { prepareTranscriptForLocalLlm } from './localAiTranscript';

const MEETING_DIALOGUE_SYSTEM_PREFIX = [
  'You are a layout assistant for voice note transcripts. Output one JSON object only: raw JSON, no markdown fences, no commentary.',
  'Schema: {"meetingDialogueMarkdown":"..."}',
  LOCAL_MEETING_PSEUDO_BASE,
].join(' ');

export function buildMeetingDialogueSystemPrompt(ctx: AiExecutionContext): string {
  return `${MEETING_DIALOGUE_SYSTEM_PREFIX} ${LOCAL_MEETING_DIALOGUE_OUTPUT_LANGUAGE_HINT[ctx.aiOutputLanguage]}`;
}

function formatSegmentLines(segments: SummaryTaskTranscriptSegment[]): string {
  const formatClockFromMs = (ms: number): string => {
    if (!Number.isFinite(ms) || ms < 0) return '?';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };
  const lines: string[] = [];
  const max = Math.min(segments.length, 280);
  for (let i = 0; i < max; i++) {
    const seg = segments[i]!;
    const text = seg.text.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const hasStart = typeof seg.startMs === 'number' && Number.isFinite(seg.startMs) && seg.startMs >= 0;
    const hasEnd = typeof seg.endMs === 'number' && Number.isFinite(seg.endMs) && seg.endMs >= 0;
    if (hasStart || hasEnd) {
      const start = hasStart ? formatClockFromMs(seg.startMs as number) : '?';
      const end = hasEnd ? `–${formatClockFromMs(seg.endMs as number)}` : '';
      lines.push(`[${start}${end}] ${text}`);
    } else {
      lines.push(text);
    }
  }
  return lines.join('\n');
}

export type LocalMeetingDialogueRequest = {
  transcript: string;
  transcriptSegments?: SummaryTaskTranscriptSegment[];
  phase1: Pick<AiProcessingResult, 'summary' | 'suggestedTitle' | 'keyPhrases'>;
  taskExtractionHint?: string;
  onLocalGenerationProgress?: (event: AiLocalGenerationProgressEvent) => void;
  abortSignal?: AbortSignal;
};

export type LocalMeetingDialogueResult =
  | { ok: true; meetingDialogueMarkdown: string }
  | { ok: false; error: string };

export function parseMeetingDialogueMarkdown(raw: string): string | null {
  try {
    const record = parseJsonObjectWithFallbacks(raw);
    const md = record.meetingDialogueMarkdown;
    if (!isString(md)) return null;
    const t = md.trim();
    if (!t) return '';
    return t.length > FIELD_LIMITS.meetingDialogueMaxChars
      ? t.slice(0, FIELD_LIMITS.meetingDialogueMaxChars)
      : t;
  } catch {
    return null;
  }
}

async function generateMeetingDialogueRaw(
  modelId: AiExecutionContext['selectedLocalAiModel'],
  systemPrompt: string,
  userContent: string,
  maxTokens: number,
  onLlmSessionProgress?: (event: LocalLlmSessionProgressEvent) => void,
): Promise<string> {
  const combined = `${systemPrompt}\n\n${userContent}`;
  if (!localPromptFitsLlmContext(combined, maxTokens, modelId)) {
    throw new LocalAiError(
      'transcript_too_long',
      'Local meeting dialogue prompt too long for current model context',
    );
  }

  return completeLocalChat(
    modelId,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    {
      maxTokens,
      temperature: getLocalLlmSummaryTemperature(modelId, LOCAL_GEN_MEETING_DIALOGUE.temperature),
      intent: 'json' satisfies LocalLlmCompletionIntent,
      onLlmSessionProgress,
    },
  );
}

export function buildMeetingDialogueUserContent(
  transcript: string,
  phase1: LocalMeetingDialogueRequest['phase1'],
  transcriptSegments?: SummaryTaskTranscriptSegment[],
  taskExtractionHint?: string,
): string {
  const parts: string[] = [];

  const title = phase1.suggestedTitle?.trim();
  const summary = phase1.summary?.trim();
  if (title || summary) {
    parts.push(
      'Note context from an earlier extraction (hints only; every spoken line must match the transcript):',
    );
    if (title) parts.push(`Title: ${title}`);
    if (summary) parts.push(`Summary: ${summary}`);
    const kp = phase1.keyPhrases?.filter((p) => p.trim()).slice(0, 8) ?? [];
    if (kp.length > 0) {
      parts.push(`Key phrases: ${kp.join(', ')}`);
    }
  }

  const hint = taskExtractionHint?.trim();
  if (hint) {
    parts.push(
      '',
      'Optional user note (use only to disambiguate speaker layout; keep every line grounded in transcript):',
      hint.slice(0, 500),
    );
  }

  if (transcriptSegments?.length) {
    parts.push(
      '',
      'Transcript with segment timestamps (soft hints for pauses and ordering):',
      formatSegmentLines(transcriptSegments),
    );
  }

  parts.push(
    '',
    'Full transcript (primary source; if evidence is enough, produce at least one turn even for single-speaker):',
    transcript,
  );

  return parts.join('\n');
}

export async function runLocalMeetingDialogue(
  request: LocalMeetingDialogueRequest,
  ctx: AiExecutionContext,
): Promise<LocalMeetingDialogueResult> {
  try {
    if (request.abortSignal?.aborted) {
      return { ok: false, error: 'cancelled' };
    }

    const transcript = prepareTranscriptForLocalLlm(request.transcript, ctx.privateCapabilityTier);
    const systemPrompt = buildMeetingDialogueSystemPrompt(ctx);
    const userContent = buildMeetingDialogueUserContent(
      transcript,
      request.phase1,
      request.transcriptSegments,
      request.taskExtractionHint,
    );

    const maxTokens = resolvePrivateMeetingDialogueMaxTokens(ctx.privateLocalLlmBudget);

    let sessionTokens = 0;
    const onLlmProgress = request.onLocalGenerationProgress
      ? (event: LocalLlmSessionProgressEvent) => {
          if (event.kind === 'completion_tick') {
            sessionTokens += 1;
            request.onLocalGenerationProgress?.({
              kind: 'completion_token',
              tokenIndex: sessionTokens,
              nPredictBudget: maxTokens,
            });
          } else {
            request.onLocalGenerationProgress?.(event);
          }
        }
      : undefined;

    const runOnce = (user: string) => {
      sessionTokens = 0;
      return generateMeetingDialogueRaw(
        ctx.selectedLocalAiModel,
        systemPrompt,
        user,
        maxTokens,
        onLlmProgress,
      );
    };

    let raw = await runOnce(userContent);
    let markdown = parseMeetingDialogueMarkdown(raw);

    if (markdown === null) {
      raw = await runOnce(`${userContent}\n\n${STRICT_JSON_TAIL}`);
      markdown = parseMeetingDialogueMarkdown(raw);
    }

    if (markdown === null) {
      throw new LocalAiError('parse_failed', 'Invalid local meeting dialogue response');
    }

    return { ok: true, meetingDialogueMarkdown: markdown };
  } catch (err) {
    return { ok: false, error: mapLocalError(err) };
  }
}
