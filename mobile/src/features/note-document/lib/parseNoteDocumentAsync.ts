import type { VoiceRecord } from '@/entities/record';

import {
  parseNoteDocumentMarkdown,
  type ParseNoteDocumentResult,
} from './parseNoteDocumentMarkdown';

/**
 * Threshold for using async parsing.
 * Documents below this size parse synchronously to avoid overhead.
 */
const ASYNC_PARSE_THRESHOLD_CHARS = 10_000;

/**
 * Determines if a document should be parsed asynchronously.
 * Large documents benefit from background parsing to avoid blocking the UI.
 */
export function shouldUseAsyncParsing(markdownLength: number): boolean {
  return markdownLength >= ASYNC_PARSE_THRESHOLD_CHARS;
}

/**
 * Parses note document markdown asynchronously for large documents.
 * Falls back to synchronous parsing for small documents to avoid overhead.
 *
 * For documents >= 10k characters, parsing is deferred using setTimeout
 * to prevent blocking the main thread during user interactions.
 *
 * @param markdown - The markdown content to parse
 * @param record - The voice record containing context for parsing
 * @returns Promise resolving to parse result
 */
export async function parseNoteDocumentAsync(
  markdown: string,
  record: VoiceRecord,
): Promise<ParseNoteDocumentResult> {
  // Small documents: parse synchronously (faster, no overhead)
  if (!shouldUseAsyncParsing(markdown.length)) {
    return parseNoteDocumentMarkdown(markdown, record);
  }

  // Large documents: defer to next tick to avoid blocking UI
  return new Promise<ParseNoteDocumentResult>((resolve) => {
    setTimeout(() => {
      const result = parseNoteDocumentMarkdown(markdown, record);
      resolve(result);
    }, 0);
  });
}
