/** Max segments sent to the meeting-dialogue model (second pass). */
const MAX_SEGMENTS = 280;
/** Max UTF-16 units per segment text after trim. */
const MAX_SEGMENT_TEXT_CHARS = 1_800;
/** Max total user message size for the second pass (chars). */
const USER_CONTENT_MAX_CHARS = 95_000;

export type MeetingDialogueTranscriptSegment = {
  startMs?: number;
  endMs?: number;
  text: string;
};

export type MeetingDialogueUserPromptInput = {
  plainTranscript: string;
  segments?: MeetingDialogueTranscriptSegment[];
  phase1?: {
    suggestedTitle: string;
    keyPhrases?: string[];
    summary?: string;
  };
  taskExtractionHint?: string;
};

function formatClockFromMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return '?';
  }
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * Validates and normalizes client-provided transcript segments for the meeting-dialogue pass.
 */
export function sanitizeTranscriptSegmentsForMeetingPrompt(
  raw: unknown,
): MeetingDialogueTranscriptSegment[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const out: MeetingDialogueTranscriptSegment[] = [];
  for (const item of raw) {
    if (out.length >= MAX_SEGMENTS) break;
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const textRaw = typeof o.text === 'string' ? o.text : '';
    const text = clip(textRaw, MAX_SEGMENT_TEXT_CHARS);
    if (!text) continue;

    const readMs = (k: string): number | undefined => {
      const v = o[k];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return undefined;
      return Math.floor(v);
    };

    const startMs = readMs('startMs');
    const endMs = readMs('endMs');
    const seg: MeetingDialogueTranscriptSegment = { text };
    if (startMs !== undefined) seg.startMs = startMs;
    if (endMs !== undefined) seg.endMs = endMs;
    out.push(seg);
  }

  return out.length > 0 ? out : undefined;
}

function buildTimedSegmentBlock(segments: MeetingDialogueTranscriptSegment[]): string {
  const lines: string[] = [];
  for (const seg of segments) {
    const start = seg.startMs !== undefined ? formatClockFromMs(seg.startMs) : '?';
    const end =
      seg.endMs !== undefined && seg.endMs > (seg.startMs ?? -1)
        ? `–${formatClockFromMs(seg.endMs)}`
        : '';
    lines.push(`[${start}${end}] ${seg.text.replace(/\r\n/g, '\n').trim()}`);
  }
  return lines.join('\n');
}

/**
 * User message for the second OpenRouter pass (pseudo-diarization): timed segments, light phase-1 context, optional hint.
 */
export function buildMeetingDialogueUserContent(input: MeetingDialogueUserPromptInput): string {
  const parts: string[] = [];

  const p1 = input.phase1;
  if (
    p1 &&
    (p1.suggestedTitle?.trim() || (p1.keyPhrases && p1.keyPhrases.length > 0) || p1.summary?.trim())
  ) {
    const title = p1.suggestedTitle?.trim() ? clip(p1.suggestedTitle.trim(), 200) : '';
    const phrases = (p1.keyPhrases ?? [])
      .filter((x) => typeof x === 'string' && x.trim())
      .slice(0, 8)
      .map((x) => clip(x.trim(), 90));
    const summaryLine = p1.summary?.trim() ? clip(p1.summary.trim().replace(/\s+/g, ' '), 320) : '';

    const ctxLines = [
      '## Note context (from the prior extraction pass on the same recording)',
      'Use only to disambiguate meeting shape or roles. Do not invent facts that are not supported by the transcript.',
      title ? `Suggested title: ${title}` : '',
      phrases.length > 0 ? `Key phrases: ${phrases.join('; ')}` : '',
      summaryLine ? `Summary (short): ${summaryLine}` : '',
    ].filter(Boolean);
    parts.push(ctxLines.join('\n'));
  }

  const hint = input.taskExtractionHint?.trim();
  if (hint) {
    parts.push(
      [
        '## Optional user note',
        'May describe speakers, interview layout, or how to group lines. Still ground every turn in the transcript; do not add new claims.',
        hint.length > 600 ? `${hint.slice(0, 599)}…` : hint,
      ].join('\n'),
    );
  }

  if (input.segments && input.segments.length > 0) {
    parts.push(
      [
        '## Transcript with segment timestamps',
        'Timestamps are from automatic speech segmentation—use them as soft hints for pauses and ordering. Wording of each turn must still match the transcript (do not invent sentences).',
        buildTimedSegmentBlock(input.segments),
      ].join('\n'),
    );
  }

  const flat = input.plainTranscript.trim();
  parts.push(
    input.segments && input.segments.length > 0
      ? ['## Full transcript (verbatim; primary source)', flat].join('\n')
      : ['## Transcript', flat].join('\n'),
  );

  let body = parts.filter(Boolean).join('\n\n');
  if (body.length > USER_CONTENT_MAX_CHARS) {
    body = `${body.slice(0, USER_CONTENT_MAX_CHARS - 80)}\n\n[... truncated for length ...]`;
  }
  return body;
}
