export type NoteDocumentPreambleParts = {
  title: string | null;
  metadataLines: string[];
  bodyMarkdown: string;
};

const METADATA_LINE_RE = /^\*\*(.+?):\*\*\s*(.+)$/;
const ITALIC_LINE_RE = /^_(.+)_$/;

/** Splits document preamble into a reading hero (title + meta) and optional trailing markdown. */
export function splitNoteDocumentPreamble(markdown: string): NoteDocumentPreambleParts {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let index = 0;

  while (index < lines.length && !lines[index]?.trim()) {
    index += 1;
  }

  let title: string | null = null;
  const headingMatch = lines[index]?.match(/^#\s+(.+)$/);
  if (headingMatch?.[1]) {
    title = headingMatch[1].trim();
    index += 1;
  }

  const metadataLines: string[] = [];
  let sawMetadata = false;

  while (index < lines.length) {
    const trimmed = lines[index]?.trim() ?? '';
    if (!trimmed) {
      index += 1;
      if (sawMetadata) break;
      continue;
    }

    const labeled = trimmed.match(METADATA_LINE_RE);
    if (labeled?.[1] && labeled[2]) {
      metadataLines.push(`${labeled[1].trim()}: ${labeled[2].trim()}`);
      sawMetadata = true;
      index += 1;
      continue;
    }

    const italic = trimmed.match(ITALIC_LINE_RE);
    if (italic?.[1] && !sawMetadata) {
      metadataLines.push(italic[1].trim());
      sawMetadata = true;
      index += 1;
      continue;
    }

    break;
  }

  while (index < lines.length && !lines[index]?.trim()) {
    index += 1;
  }

  const bodyMarkdown = lines.slice(index).join('\n').trim();

  return { title, metadataLines, bodyMarkdown };
}
