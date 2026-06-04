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

function parseHeadingLine(line: string): { kind: MeetingRecapSectionKind; title: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const headingCandidate =
    trimmed.match(/^#{1,4}\s+(.+)$/)?.[1] ??
    trimmed.match(/^\*\*(.+?)\*\*:?\s*$/)?.[1] ??
    trimmed.match(/^([^:]{2,48}):\s*$/)?.[1] ??
    trimmed.match(/^\d+[.)]\s+([^:]{2,48}):?\s*$/)?.[1];

  if (!headingCandidate) return null;

  const kind = LABEL_TO_KIND.get(normalizeHeading(headingCandidate));
  return kind ? { kind, title: headingCandidate.trim() } : null;
}

export function parseMeetingRecapSummary(summary: string): MeetingRecapSection[] {
  const lines = summary.replace(/\r\n?/g, '\n').split('\n');
  const sections: MeetingRecapSection[] = [];
  let current: MeetingRecapSection | null = null;

  for (const line of lines) {
    const heading = parseHeadingLine(line);
    if (heading) {
      if (current?.body.trim()) {
        sections.push({ ...current, body: current.body.trim() });
      }
      current = { ...heading, body: '' };
      continue;
    }

    if (current) {
      current.body = [current.body, line].filter(Boolean).join('\n');
    }
  }

  if (current?.body.trim()) {
    sections.push({ ...current, body: current.body.trim() });
  }

  const seen = new Set<MeetingRecapSectionKind>();
  const unique = sections.filter((section) => {
    if (seen.has(section.kind)) return false;
    seen.add(section.kind);
    return true;
  });

  return unique.length >= 2 ? unique : [];
}
