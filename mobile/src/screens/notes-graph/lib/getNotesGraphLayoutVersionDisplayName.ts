import type { TFunction } from 'i18next';

import type { NotesGraphLayoutVersionEntry } from './notesGraphLayoutDb';

type LayoutVersionLabelSource = Pick<NotesGraphLayoutVersionEntry, 'name' | 'versionNumber'>;

export function getNotesGraphLayoutVersionDisplayName(
  entry: LayoutVersionLabelSource,
  t: TFunction,
): string {
  const trimmed = entry.name?.trim();
  if (trimmed) return trimmed;
  return t('notesGraph.history.versionLabel', { version: entry.versionNumber });
}
