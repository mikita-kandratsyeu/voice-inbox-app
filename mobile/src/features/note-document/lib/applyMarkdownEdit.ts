export type TextSelection = {
  start: number;
  end: number;
};

export type MarkdownEditAction =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'heading2'
  | 'heading3'
  | 'bullet'
  | 'ordered'
  | 'task'
  | 'quote'
  | 'code'
  | 'link'
  | 'divider';

export type MarkdownEditResult = {
  text: string;
  selection: TextSelection;
};

const ORDERED_LINE_RE = /^\d+\.\s+/;
const DEFAULT_LINK_LABEL = 'link';

function lineStartIndex(text: string, index: number): number {
  const clamped = Math.max(0, Math.min(index, text.length));
  const prevNewline = text.lastIndexOf('\n', clamped - 1);
  return prevNewline === -1 ? 0 : prevNewline + 1;
}

function lineEndIndex(text: string, index: number): number {
  const clamped = Math.max(0, Math.min(index, text.length));
  const nextNewline = text.indexOf('\n', clamped);
  return nextNewline === -1 ? text.length : nextNewline;
}

function wrapSelection(
  text: string,
  selection: TextSelection,
  left: string,
  right: string,
): MarkdownEditResult {
  const { start, end } = selection;
  const selected = text.slice(start, end);

  if (selected.length > 0) {
    const wrapped = `${left}${selected}${right}`;
    return {
      text: text.slice(0, start) + wrapped + text.slice(end),
      selection: { start: start + left.length, end: end + left.length },
    };
  }

  const insert = `${left}${right}`;
  const cursor = start + left.length;
  return {
    text: text.slice(0, start) + insert + text.slice(end),
    selection: { start: cursor, end: cursor },
  };
}

function prefixLines(text: string, selection: TextSelection, prefix: string): MarkdownEditResult {
  const startLine = lineStartIndex(text, selection.start);
  const endLine = lineEndIndex(text, selection.end);
  const block = text.slice(startLine, endLine);
  const prefixed = block
    .split('\n')
    .map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`))
    .join('\n');

  const delta = prefixed.length - block.length;
  return {
    text: text.slice(0, startLine) + prefixed + text.slice(endLine),
    selection: {
      start: selection.start + prefix.length,
      end: selection.end + delta,
    },
  };
}

function prefixOrderedLines(text: string, selection: TextSelection): MarkdownEditResult {
  const startLine = lineStartIndex(text, selection.start);
  const endLine = lineEndIndex(text, selection.end);
  const block = text.slice(startLine, endLine);
  let lineNumber = 1;
  const prefixed = block
    .split('\n')
    .map((line) => {
      const content = line.replace(ORDERED_LINE_RE, '');
      return `${lineNumber++}. ${content}`;
    })
    .join('\n');

  const delta = prefixed.length - block.length;
  return {
    text: text.slice(0, startLine) + prefixed + text.slice(endLine),
    selection: {
      start: selection.start + '1. '.length,
      end: selection.end + delta,
    },
  };
}

function insertBlock(text: string, selection: TextSelection, block: string): MarkdownEditResult {
  const { start, end } = selection;
  const needsLeadingNewline = start > 0 && text[start - 1] !== '\n';
  const insert = `${needsLeadingNewline ? '\n' : ''}${block}`;
  const cursor = start + insert.length;
  return {
    text: text.slice(0, start) + insert + text.slice(end),
    selection: { start: cursor, end: cursor },
  };
}

export function normalizeMarkdownLinkUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isValidMarkdownLinkUrl(url: string): boolean {
  const normalized = normalizeMarkdownLinkUrl(url);
  return /^https?:\/\/.+/i.test(normalized);
}

export function applyMarkdownLink(
  text: string,
  selection: TextSelection,
  url: string,
): MarkdownEditResult {
  const normalizedUrl = normalizeMarkdownLinkUrl(url);
  const { start, end } = selection;
  const selected = text.slice(start, end);
  const label = selected.length > 0 ? selected : DEFAULT_LINK_LABEL;
  const markdown = `[${label}](${normalizedUrl})`;

  if (selected.length > 0) {
    const cursor = start + markdown.length;
    return {
      text: text.slice(0, start) + markdown + text.slice(end),
      selection: { start: cursor, end: cursor },
    };
  }

  const labelStart = start + 1;
  return {
    text: text.slice(0, start) + markdown + text.slice(end),
    selection: { start: labelStart, end: labelStart + label.length },
  };
}

export function applyMarkdownEdit(
  text: string,
  selection: TextSelection,
  action: MarkdownEditAction,
): MarkdownEditResult {
  switch (action) {
    case 'bold':
      return wrapSelection(text, selection, '**', '**');
    case 'italic':
      return wrapSelection(text, selection, '*', '*');
    case 'strikethrough':
      return wrapSelection(text, selection, '~~', '~~');
    case 'heading2':
      return prefixLines(text, selection, '## ');
    case 'heading3':
      return prefixLines(text, selection, '### ');
    case 'bullet':
      return prefixLines(text, selection, '- ');
    case 'ordered':
      return prefixOrderedLines(text, selection);
    case 'task':
      return prefixLines(text, selection, '- [ ] ');
    case 'quote':
      return prefixLines(text, selection, '> ');
    case 'code':
      return wrapSelection(text, selection, '`', '`');
    case 'divider':
      return insertBlock(text, selection, '\n---\n');
    case 'link':
      return { text, selection };
    default:
      return { text, selection };
  }
}
