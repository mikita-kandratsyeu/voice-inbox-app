import { prepareShareNoteEmailMarkdown } from '@/lib/prepareShareNoteEmailMarkdown';

/** Consecutive `**Label:**` metadata lines → separate paragraphs (CommonMark collapses single `\n`). */
function normalizeShareNoteMetaBlockForWeb(markdown: string): string {
  let out = markdown;
  out = out.replace(/^(\*\*[^*\n]+:\*\*[^\n]*)\n(?=\*\*[^*\n]+:\*\*)/gm, '$1\n\n');
  out = out.replace(/^(\*\*[^*\n]+:\*\*[^\n]*)\n(## )/gm, '$1\n\n$2');
  out = out.replace(/^(## [^\n]+)\n(_[^_\n]+_)\n(?!\n)/gm, '$1\n\n$2\n\n');
  return out;
}

/** Normalizes mobile share markdown for the public web page. */
export function prepareShareNoteWebMarkdown(markdown: string): string {
  let out = prepareShareNoteEmailMarkdown(markdown);
  out = normalizeShareNoteMetaBlockForWeb(out);
  return out;
}
