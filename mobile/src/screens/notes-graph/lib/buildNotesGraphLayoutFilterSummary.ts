import type { TFunction } from 'i18next';

import { shouldAutoSimplifyGraph } from './graphSimplifyMode';
import type { GraphEdgeVisibility, GraphFilters } from './graphTypes';
import type { ParsedNotesGraphPersistKey } from './parseNotesGraphPersistKey';
import { parsedPersistKeyToGraphFilters } from './parseNotesGraphPersistKey';

export type NotesGraphLayoutFilterRow = {
  id: string;
  label: string;
  value: string;
};

type BuildNotesGraphLayoutFilterSummaryParams = {
  filters: GraphFilters;
  folderName: string | null;
  foldersEnabled: boolean;
  simplifyActive: boolean;
  simplifyIsAuto: boolean;
  t: TFunction;
};

function formatEdgeVisibility(edgeVisibility: GraphEdgeVisibility, t: TFunction): string {
  const enabled: string[] = [];
  if (edgeVisibility.similar) enabled.push(t('notesGraph.filters.similar'));
  if (edgeVisibility.sharedTag) enabled.push(t('notesGraph.filters.tags'));
  if (edgeVisibility.sameFolder) enabled.push(t('notesGraph.filters.folders'));
  if (edgeVisibility.linked) enabled.push(t('notesGraph.filters.linked'));

  if (enabled.length === 0) {
    return t('notesGraph.history.filters.linksNone');
  }

  return enabled.join(', ');
}

function formatSimplifyView(
  simplifyActive: boolean,
  simplifyIsAuto: boolean,
  t: TFunction,
): string {
  if (!simplifyActive) return t('notesGraph.history.filters.viewFull');
  if (simplifyIsAuto) return t('notesGraph.history.filters.viewSimplifiedAuto');
  return t('notesGraph.history.filters.viewSimplified');
}

export function buildNotesGraphLayoutFilterSummary({
  filters,
  folderName,
  foldersEnabled,
  simplifyActive,
  simplifyIsAuto,
  t,
}: BuildNotesGraphLayoutFilterSummaryParams): NotesGraphLayoutFilterRow[] {
  const rows: NotesGraphLayoutFilterRow[] = [];

  if (foldersEnabled) {
    rows.push({
      id: 'folder',
      label: t('notesGraph.history.filters.folder'),
      value: folderName ?? t('notesGraph.filters.allFolders'),
    });
  }

  rows.push({
    id: 'tags',
    label: t('notesGraph.history.filters.tags'),
    value:
      filters.tags.length > 0
        ? filters.tags
            .slice()
            .sort((a, b) => a.localeCompare(b))
            .join(', ')
        : t('notesGraph.history.filters.tagsNone'),
  });

  rows.push({
    id: 'showTasks',
    label: t('notesGraph.history.filters.showTasks'),
    value: filters.showTasks ? t('settings.on') : t('settings.off'),
  });

  rows.push({
    id: 'showCompletedTasks',
    label: t('notesGraph.history.filters.showCompletedTasks'),
    value: filters.showCompletedTasks ? t('settings.on') : t('settings.off'),
  });

  rows.push({
    id: 'showArchived',
    label: t('notesGraph.history.filters.showArchived'),
    value: filters.showArchived ? t('settings.on') : t('settings.off'),
  });

  rows.push({
    id: 'links',
    label: t('notesGraph.history.filters.links'),
    value: formatEdgeVisibility(filters.edgeVisibility, t),
  });

  rows.push({
    id: 'layoutMode',
    label: t('notesGraph.history.filters.layoutMode'),
    value: t(`notesGraph.filters.layoutMode.${filters.layoutMode}`),
  });

  rows.push({
    id: 'view',
    label: t('notesGraph.history.filters.view'),
    value: formatSimplifyView(simplifyActive, simplifyIsAuto, t),
  });

  return rows;
}

export function buildNotesGraphLayoutFilterSummaryFromParsed(
  parsed: ParsedNotesGraphPersistKey,
  folderName: string | null,
  foldersEnabled: boolean,
  t: TFunction,
): NotesGraphLayoutFilterRow[] {
  const simplifyActive = parsed.simplifyOverride ?? shouldAutoSimplifyGraph(parsed.filteredCount);
  const simplifyIsAuto =
    parsed.simplifyOverride === null && shouldAutoSimplifyGraph(parsed.filteredCount);

  return buildNotesGraphLayoutFilterSummary({
    filters: parsedPersistKeyToGraphFilters(parsed),
    folderName,
    foldersEnabled,
    simplifyActive,
    simplifyIsAuto,
    t,
  });
}
