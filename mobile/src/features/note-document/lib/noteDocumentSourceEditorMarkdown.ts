import type { VoiceRecord } from '@/entities/record';
import { stripLinkedNotesSectionFromSourceEditor } from '@/features/note-links/lib/appendLinkedNotesSectionForReading';
import { buildDocumentMetadataMarkdownLines } from '@/features/share-record/lib/documentMetadataMarkdown';
import {
  resolveShareExportContext,
  type ShareExportContext,
} from '@/features/share-record/lib/shareExportContext';

import { splitNoteDocumentPreamble } from './splitNoteDocumentPreamble';

const SECTION_MARKER_START_RE = /<!--\s*vi:section:[a-z0-9-]+\s*-->/i;

function splitAtFirstSectionMarker(markdown: string): { preamble: string; suffix: string } {
  const match = SECTION_MARKER_START_RE.exec(markdown);
  if (!match || match.index === undefined) {
    return { preamble: markdown, suffix: '' };
  }

  return {
    preamble: markdown.slice(0, match.index),
    suffix: markdown.slice(match.index),
  };
}

function joinPreambleAndSuffix(preamble: string, suffix: string): string {
  const trimmedPreamble = preamble.trimEnd();
  if (!suffix) {
    return trimmedPreamble;
  }
  if (!trimmedPreamble) {
    return suffix;
  }
  return `${trimmedPreamble}\n\n${suffix}`;
}

function rebuildPreambleWithoutMetadata(preamble: string): string {
  const parts = splitNoteDocumentPreamble(preamble);
  const lines: string[] = [];

  if (parts.title) {
    lines.push(`# ${parts.title}`);
  }

  const body = parts.bodyMarkdown.trim();
  if (body) {
    if (lines.length > 0) {
      lines.push('');
    }
    lines.push(body);
  }

  return lines.join('\n');
}

/** Hides auto-generated date/duration/folder metadata from the source editor. */
export function stripDocumentMetadataForSourceEditor(markdown: string): string {
  const { preamble, suffix } = splitAtFirstSectionMarker(markdown);
  return joinPreambleAndSuffix(rebuildPreambleWithoutMetadata(preamble), suffix);
}

export function restoreDocumentMetadataInPreamble(
  markdown: string,
  metadataLines: readonly string[],
): string {
  if (metadataLines.length === 0) {
    return markdown;
  }

  const { preamble, suffix } = splitAtFirstSectionMarker(markdown);
  const parts = splitNoteDocumentPreamble(preamble);

  if (parts.metadataLines.length > 0) {
    return markdown;
  }

  const lines: string[] = [];
  if (parts.title) {
    lines.push(`# ${parts.title}`);
    lines.push('');
    lines.push(...metadataLines);
  } else {
    return markdown;
  }

  const body = parts.bodyMarkdown.trim();
  if (body) {
    lines.push('');
    lines.push(body);
  }

  return joinPreambleAndSuffix(lines.join('\n'), suffix);
}

export function finalizeNoteDocumentFromSourceEditor(
  markdown: string,
  record: VoiceRecord,
  context?: ShareExportContext,
): string {
  const ctx = resolveShareExportContext({ ...context, forDocument: true });
  const withoutLinkedSection = stripLinkedNotesSectionFromSourceEditor(markdown);
  return restoreDocumentMetadataInPreamble(
    withoutLinkedSection,
    buildDocumentMetadataMarkdownLines(record, ctx),
  );
}

export function prepareNoteDocumentForSourceEditor(markdown: string): string {
  return stripDocumentMetadataForSourceEditor(markdown);
}
