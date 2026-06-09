import {
  buildNotesGraphLayoutFilterSummary,
  buildNotesGraphLayoutFilterSummaryFromParsed,
} from '../buildNotesGraphLayoutFilterSummary';
import { DEFAULT_EDGE_VISIBILITY, type GraphFilters } from '../graphTypes';
import { parseNotesGraphPersistKey } from '../parseNotesGraphPersistKey';

const t = ((key: string) => key) as Parameters<typeof buildNotesGraphLayoutFilterSummary>[0]['t'];

const baseFilters: GraphFilters = {
  folderId: null,
  tags: [],
  showTasks: true,
  edgeVisibility: { ...DEFAULT_EDGE_VISIBILITY },
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

    expect(rows.map((row) => row.id)).toEqual(['folder', 'tags', 'showTasks', 'links', 'view']);
    expect(rows[0]?.value).toBe('notesGraph.filters.allFolders');
    expect(rows[1]?.value).toBe('notesGraph.history.filters.tagsNone');
    expect(rows[4]?.value).toBe('notesGraph.history.filters.viewFull');
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
