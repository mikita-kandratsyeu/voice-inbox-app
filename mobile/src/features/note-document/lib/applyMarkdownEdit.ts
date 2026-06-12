export type TextSelection = {
  start: number;
  end: number;
};

export type MarkdownEditAction =
  | 'bold'
  | 'italic'
  | 'heading2'
  | 'heading3'
  | 'bullet'
  | 'task'
  | 'quote'
  | 'divider';

export type MarkdownEditResult = {
  text: string;
  selection: TextSelection;
};

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

function prefixLines(
  text: string,
  selection: TextSelection,
  prefix: string,
): MarkdownEditResult {
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
    case 'heading2':
      return prefixLines(text, selection, '## ');
    case 'heading3':
      return prefixLines(text, selection, '### ');
    case 'bullet':
      return prefixLines(text, selection, '- ');
    case 'task':
      return prefixLines(text, selection, '- [ ] ');
    case 'quote':
      return prefixLines(text, selection, '> ');
    case 'divider':
      return insertBlock(text, selection, '\n---\n');
    default:
      return { text, selection };
  }
}
