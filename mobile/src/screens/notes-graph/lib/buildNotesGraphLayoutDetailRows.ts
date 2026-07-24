import type { TFunction } from 'i18next';

import type { NotesGraphLayoutFilterRow } from './buildNotesGraphLayoutFilterSummary';
import { formatNotesGraphLayoutVersionTimestamp } from './formatNotesGraphLayoutVersionTimestamp';
import type { NotesGraphLayoutVersionEntry } from './notesGraphLayoutDb';

export type NotesGraphLayoutDetailRow = {
  id: string;
  label: string;
  value: string;
};

type BuildNotesGraphLayoutDetailRowsParams = {
  entry: NotesGraphLayoutVersionEntry;
  filterRows: NotesGraphLayoutFilterRow[];
  language: string;
  t: TFunction;
};

export function buildNotesGraphLayoutDetailRows({
  entry,
  filterRows,
  language,
  t,
}: BuildNotesGraphLayoutDetailRowsParams): NotesGraphLayoutDetailRow[] {
  return [
    {
      id: 'savedOn',
      label: t('notesGraph.history.detailsSavedOn'),
      value: formatNotesGraphLayoutVersionTimestamp(entry.createdAt, language),
    },
    {
      id: 'nodeCount',
      label: t('notesGraph.history.detailsNodes'),
      value: t('notesGraph.history.nodeCount', { count: entry.nodeCount }),
    },
    ...filterRows,
  ];
}
