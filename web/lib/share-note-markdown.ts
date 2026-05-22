import { normalizeInlineSpeakerLabelsToParagraphBreaks } from '@/lib/normalizeSpeakerTurnsMarkdown';

const SPEAKER_LABEL =
  '(?:Speaker|Участник|Спикер|Participant|Interviewer|Interviewee|Host|Guest|Модератор|Интервьюер|Ведущий)(?:\\s+\\d+|\\s*\\d+)?';

const SPEAKER_BLOCKQUOTE_RE = new RegExp(`^\\s*(?:\\*\\*)?(${SPEAKER_LABEL})\\s*:(?:\\*\\*)?`, 'i');

const EMAIL_META_LINE_RE = /^\*\*[^*]+\*\*:\s/;

/** Strip leading metadata lines (**Date:**, **Note ID:**, etc.) from share markdown. */
export function stripLeadingShareNoteMetadata(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i++;
      continue;
    }
    if (EMAIL_META_LINE_RE.test(trimmed)) {
      i++;
      continue;
    }
    if (/^_[^_].*_$/.test(trimmed)) {
      i++;
      continue;
    }
    break;
  }
  return lines.slice(i).join('\n').trimStart();
}

/** Normalize markdown before HTML / plain-text email rendering. */
export function prepareShareNoteMarkdownForEmail(markdown: string, emailTitle?: string): string {
  let out = normalizeInlineSpeakerLabelsToParagraphBreaks(markdown.trim());
  if (emailTitle?.trim()) {
    out = stripLeadingTitleHeading(out, emailTitle.trim());
  }
  out = stripLeadingShareNoteMetadata(out);
  out = collapseExtraBlankLines(out);
  return out;
}

export function stripLeadingTitleHeading(markdown: string, title: string): string {
  const lines = markdown.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i >= lines.length) return markdown;

  const line = lines[i].trim();
  const h1 = line.match(/^#\s+(.+)$/);
  if (!h1) return markdown;

  const headingTitle = h1[1].trim();
  if (headingTitle !== title.trim()) return markdown;

  let j = i + 1;
  while (j < lines.length && lines[j].trim() === '') j++;
  return lines.slice(j).join('\n').trimStart();
}

export function collapseExtraBlankLines(markdown: string): string {
  return markdown.replace(/\n{3,}/g, '\n\n');
}

export function isSpeakerTurnBlockquote(childrenText: string): boolean {
  return SPEAKER_BLOCKQUOTE_RE.test(childrenText.trim());
}

export function speakerSlotFromBlockquote(childrenText: string): number {
  const m = childrenText.trim().match(SPEAKER_BLOCKQUOTE_RE);
  if (!m) return 0;
  const digits = m[1].match(/(\d+)/);
  if (digits) return (parseInt(digits[1], 10) - 1) % 4;
  let hash = 0;
  for (let i = 0; i < m[1].length; i++) hash = (hash + m[1].charCodeAt(i)) | 0;
  return Math.abs(hash) % 4;
}

/** First non-empty line for email preheader (inbox preview). */
export function extractShareEmailPreheader(markdown: string, maxLen = 140): string {
  const prepared = prepareShareNoteMarkdownForEmail(markdown);
  for (const raw of prepared.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#{1,6}\s/.test(line)) continue;
    if (/^[-*]\s/.test(line)) {
      const item = line.replace(/^[-*]\s+/, '').replace(/\*\*/g, '');
      if (item) return truncatePreheader(item, maxLen);
    }
    if (line.startsWith('>')) {
      const q = line.replace(/^>\s*/, '').replace(/\*\*/g, '');
      if (q) return truncatePreheader(q, maxLen);
    }
    const plain = line.replace(/\*\*/g, '').replace(/_/g, '');
    if (plain) return truncatePreheader(plain, maxLen);
  }
  return '';
}

function truncatePreheader(text: string, maxLen: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trimEnd()}…`;
}

/** Human-readable plain text (not raw Markdown) for the `text` MIME part. */
export function renderShareNotePlainText(markdown: string, emailTitle?: string): string {
  const src = prepareShareNoteMarkdownForEmail(markdown, emailTitle);
  const lines: string[] = [];
  let inCode = false;
  const codeBuf: string[] = [];

  const flushCode = () => {
    if (codeBuf.length) {
      lines.push(codeBuf.join('\n'));
      codeBuf.length = 0;
    }
  };

  for (const raw of src.split(/\r?\n/)) {
    const trimmed = raw.trimEnd();
    if (trimmed.startsWith('```')) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(raw);
      continue;
    }

    let line = trimmed;
    if (!line) {
      lines.push('');
      continue;
    }

    if (/^#{1,6}\s/.test(line)) {
      line = line.replace(/^#{1,6}\s+/, '').replace(/\*\*/g, '');
      lines.push('');
      lines.push(line.toUpperCase() === line ? line : line);
      lines.push('');
      continue;
    }

    if (line.startsWith('>')) {
      line = line.replace(/^>\s*/, '').replace(/\*\*([^*]+)\*\*/g, '$1');
      lines.push(line);
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      line = line
        .replace(/^[-*]\s+/, '• ')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      lines.push(line);
      continue;
    }

    line = line
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
      .replace(/^---+$/, '────────────');

    lines.push(line);
  }

  if (inCode && codeBuf.length) flushCode();

  return collapseExtraBlankLines(lines.join('\n').trim());
}
