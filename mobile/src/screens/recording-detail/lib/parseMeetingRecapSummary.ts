export type MeetingRecapSectionKind =
  | 'brief'
  | 'decisions'
  | 'tasks'
  | 'openQuestions'
  | 'nextSteps';

export type MeetingRecapSection = {
  kind: MeetingRecapSectionKind;
  title: string;
  body: string;
};

const SECTION_LABELS: Record<MeetingRecapSectionKind, string[]> = {
  brief: ['brief', 'summary', 'short recap', 'коротко', 'кратко', 'сводка'],
  decisions: ['decisions', 'agreements', 'решения', 'договоренности', 'договорённости'],
  tasks: ['tasks', 'action items', 'actions', 'задачи', 'действия'],
  openQuestions: [
    'open questions',
    'questions',
    'unresolved questions',
    'открытые вопросы',
    'вопросы',
    'нерешенные вопросы',
    'нерешённые вопросы',
  ],
  nextSteps: ['next steps', 'follow-ups', 'follow ups', 'следующие шаги', 'что дальше'],
};

const LABEL_TO_KIND = new Map<string, MeetingRecapSectionKind>(
  Object.entries(SECTION_LABELS).flatMap(([kind, labels]) =>
    labels.map((label) => [label, kind as MeetingRecapSectionKind]),
  ),
);

const SECTION_LABEL_PATTERN = Object.values(SECTION_LABELS)
  .flat()
  .sort((a, b) => b.length - a.length)
  .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');

const INLINE_SECTION_RE = new RegExp(`([^\\n])\\s+(${SECTION_LABEL_PATTERN})\\s*:`, 'gi');
const SECTION_START_RE = new RegExp(
  `^(?:#{1,4}\\s+|\\d+[.)]\\s+|[-*]\\s+)?\\*?\\*?(${SECTION_LABEL_PATTERN})\\*?\\*?\\s*:\\s*(.*)$`,
  'i',
);

function normalizeHeading(raw: string): string {
  return raw
    .replace(/^#{1,4}\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/^[-*]\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/:$/, '')
    .trim()
    .toLowerCase();
}

function extractSectionTitle(raw: string): string {
  return raw
    .replace(/^#{1,4}\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/^[-*]\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/:$/, '')
    .trim();
}

function parseSectionStart(
  line: string,
): { kind: MeetingRecapSectionKind; title: string; body: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const inlineMatch = trimmed.match(SECTION_START_RE);
  if (inlineMatch?.[1]) {
    const title = inlineMatch[1].trim();
    const kind = LABEL_TO_KIND.get(normalizeHeading(title));
    return kind ? { kind, title, body: inlineMatch[2]?.trim() ?? '' } : null;
  }

  const normalized = normalizeHeading(trimmed);
  const exactKind = LABEL_TO_KIND.get(normalized);
  if (exactKind) {
    return { kind: exactKind, title: extractSectionTitle(trimmed), body: '' };
  }

  return null;
}

function normalizeInlineSections(summary: string): string {
  return summary.replace(INLINE_SECTION_RE, (_match, before: string, label: string) => {
    return `${before}\n${label}:`;
  });
}

const MEETING_SUMMARY_HEADING_RE = /^#{2,4}\s+(.+?)\s*$/;

/** Converts document markdown headings back to meeting-recap `Label:` sections. */
export function restoreMeetingSummaryFromDocumentMarkdown(body: string): string {
  if (!/^#{2,4}\s+/m.test(body)) {
    return body;
  }

  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let currentLabel: string | null = null;
  let sectionLines: string[] = [];

  const flush = () => {
    if (!currentLabel) return;
    const trimmed = sectionLines.join('\n').trimEnd();
    out.push(trimmed ? `${currentLabel}:\n${trimmed}` : `${currentLabel}:`);
    sectionLines = [];
  };

  for (const line of lines) {
    const heading = line.match(MEETING_SUMMARY_HEADING_RE);
    if (heading) {
      flush();
      currentLabel = heading[1]!.trim();
      continue;
    }

    if (currentLabel !== null) {
      sectionLines.push(line);
    } else if (line.trim()) {
      out.push(line);
    }
  }

  flush();
  return out.join('\n\n').trim();
}

export function parseMeetingRecapSummary(summary: string): MeetingRecapSection[] {
  const lines = normalizeInlineSections(summary).replace(/\r\n?/g, '\n').split('\n');
  const sections: MeetingRecapSection[] = [];
  let current: MeetingRecapSection | null = null;
  let pendingLines: string[] = [];

  const flushPendingAsBrief = () => {
    const pending = pendingLines.join('\n').trim();
    pendingLines = [];
    if (!pending) return;
    sections.push({ kind: 'brief', title: 'Brief', body: pending });
  };

  for (const line of lines) {
    const sectionStart = parseSectionStart(line);
    if (sectionStart) {
      if (current?.body.trim()) {
        sections.push({ ...current, body: current.body.trim() });
      }

      if (pendingLines.length > 0) {
        const pending = pendingLines.join('\n').trim();
        pendingLines = [];
        if (sectionStart.kind === 'brief') {
          sectionStart.body = [pending, sectionStart.body].filter(Boolean).join('\n');
        } else if (pending) {
          sections.push({ kind: 'brief', title: 'Brief', body: pending });
        }
      }

      current = sectionStart;
      continue;
    }

    if (current) {
      current.body = [current.body, line].filter(Boolean).join('\n');
    } else if (line.trim()) {
      pendingLines.push(line);
    }
  }

  if (current?.body.trim()) {
    sections.push({ ...current, body: current.body.trim() });
  } else if (pendingLines.length > 0) {
    flushPendingAsBrief();
  }

  const seen = new Set<MeetingRecapSectionKind>();
  const unique = sections.filter((section) => {
    if (seen.has(section.kind)) return false;
    seen.add(section.kind);
    return true;
  });

  return unique.length > 0 ? unique : [];
}
