import {
  buildNotesGraphLayoutFilterSummary,
  buildNotesGraphLayoutFilterSummaryFromParsed,
} from '../buildNotesGraphLayoutFilterSummary';
import {
  DEFAULT_EDGE_VISIBILITY,
  DEFAULT_GRAPH_LAYOUT_MODE,
  type GraphFilters,
} from '../graphTypes';
import { parseNotesGraphPersistKey } from '../parseNotesGraphPersistKey';

const t = ((key: string) => key) as Parameters<typeof buildNotesGraphLayoutFilterSummary>[0]['t'];

const baseFilters: GraphFilters = {
  folderId: null,
  tags: [],
  showTasks: true,
  edgeVisibility: { ...DEFAULT_EDGE_VISIBILITY },
  layoutMode: DEFAULT_GRAPH_LAYOUT_MODE,
};

describe('buildNotesGraphLayoutFilterSummary', () => {
  it('includes folder, tags, tasks, links, and view rows', () => {
    const rows = buildNotesGraphLayoutFilterSummary({
      filters: baseFilters,
      folderName: null,
      foldersEnabled: true,
      simplifyActive: false,
      simplifyIsAuto: false,
      t,
    });

    expect(rows.map((row) => row.id)).toEqual([
      'folder',
      'tags',
      'showTasks',
      'links',
      'layoutMode',
      'view',
    ]);
    expect(rows[0]?.value).toBe('notesGraph.filters.allFolders');
    expect(rows[1]?.value).toBe('notesGraph.history.filters.tagsNone');
    expect(rows.find((row) => row.id === 'layoutMode')?.value).toBe(
      'notesGraph.filters.layoutMode.cluster',
    );
    expect(rows[5]?.value).toBe('notesGraph.history.filters.viewFull');
  });

  it.each([
    ['force', 'notesGraph.filters.layoutMode.force'],
    ['circular', 'notesGraph.filters.layoutMode.circular'],
  ] as const)('maps %s layout mode to history label', (layoutMode, expectedValue) => {
    const rows = buildNotesGraphLayoutFilterSummary({
      filters: { ...baseFilters, layoutMode },
      folderName: null,
      foldersEnabled: true,
      simplifyActive: false,
      simplifyIsAuto: false,
      t,
    });

    expect(rows.find((row) => row.id === 'layoutMode')?.value).toBe(expectedValue);
  });

  it('omits folder row when folders are disabled', () => {
    const rows = buildNotesGraphLayoutFilterSummary({
      filters: { ...baseFilters, tags: ['alpha', 'beta'] },
      folderName: 'Work',
      foldersEnabled: false,
      simplifyActive: true,
      simplifyIsAuto: true,
      t,
    });

    expect(rows.find((row) => row.id === 'folder')).toBeUndefined();
    expect(rows.find((row) => row.id === 'tags')?.value).toBe('alpha, beta');
    expect(rows.find((row) => row.id === 'view')?.value).toBe(
      'notesGraph.history.filters.viewSimplifiedAuto',
    );
  });
});

describe('buildNotesGraphLayoutFilterSummaryFromParsed', () => {
  it('derives simplify state from parsed persist key', () => {
    const layoutKey = [
      '2:a,b',
      '',
      'work',
      '1',
      'contains:1,sameFolder:1,sharedTag:1,similar:1',
      'auto',
      '200',
    ].join(';');
    const parsed = parseNotesGraphPersistKey(layoutKey)!;

    const rows = buildNotesGraphLayoutFilterSummaryFromParsed(parsed, null, true, t);

    expect(rows.find((row) => row.id === 'view')?.value).toBe(
      'notesGraph.history.filters.viewSimplifiedAuto',
    );
  });
});
