const DOCUMENT_EXT_RE = /\.(md|markdown|pdf)(?:[?#].*)?$/i;
const PLAIN_TEXT_EXT_RE = /\.txt(?:[?#].*)?$/i;

export const MAX_DOCUMENT_IMPORT_CHARS = 500_000;
export const MIN_DOCUMENT_IMPORT_CHARS = 1;

export type ParsedDocumentImport = {
  transcript: string;
  charCount: number;
};

export function isDocumentImportFileName(name: string | null | undefined): boolean {
  return DOCUMENT_EXT_RE.test(name?.trim() ?? '');
}

export function isPlainTextImportFileName(name: string | null | undefined): boolean {
  return PLAIN_TEXT_EXT_RE.test(name?.trim() ?? '');
}

export function isPdfImportFileName(name: string | null | undefined): boolean {
  return /\.pdf(?:[?#].*)?$/i.test(name?.trim() ?? '');
}

export function normalizeDocumentText(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(String.fromCharCode(0))
    .join('')
    .trim();
}

export function parseDocumentImport(raw: string): ParsedDocumentImport | null {
  const transcript = normalizeDocumentText(raw);
  if (transcript.length < MIN_DOCUMENT_IMPORT_CHARS) return null;
  if (transcript.length > MAX_DOCUMENT_IMPORT_CHARS) return null;
  return { transcript, charCount: transcript.length };
}
