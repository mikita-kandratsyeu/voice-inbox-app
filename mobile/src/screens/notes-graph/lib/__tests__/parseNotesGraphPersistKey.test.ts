import {
  parsedPersistKeyToGraphFilters,
  parseNotesGraphPersistKey,
} from '../parseNotesGraphPersistKey';

describe('parseNotesGraphPersistKey', () => {
  it('parses filter fields from a persisted layout key', () => {
    const layoutKey = [
      '2:a,b',
      'folder-1',
      'beta|alpha',
      '0',
      '0',
      'contains:0,sameFolder:1,sharedTag:0,similar:1',
      'cluster',
      'auto',
      '5',
    ].join(';');

    const parsed = parseNotesGraphPersistKey(layoutKey);
    expect(parsed).not.toBeNull();
    expect(parsed?.folderId).toBe('folder-1');
    expect(parsed?.tags).toEqual(['beta', 'alpha']);
    expect(parsed?.showTasks).toBe(false);
    expect(parsed?.showArchived).toBe(false);
    expect(parsed?.simplifyOverride).toBeNull();
    expect(parsed?.filteredCount).toBe(5);
    expect(parsedPersistKeyToGraphFilters(parsed!).edgeVisibility).toEqual({
      similar: true,
      sharedTag: false,
      sameFolder: true,
      contains: false,
    });
    expect(parsed?.layoutMode).toBe('cluster');
  });

  it('parses legacy keys without showArchived as off', () => {
    const layoutKey = [
      '2:a,b',
      'folder-1',
      'beta|alpha',
      '0',
      'contains:0,sameFolder:1,sharedTag:0,similar:1',
      'cluster',
      'auto',
      '5',
    ].join(';');

    expect(parseNotesGraphPersistKey(layoutKey)?.showArchived).toBe(false);
  });

  it('parses legacy keys without layout mode as cluster', () => {
    const layoutKey = [
      '2:a,b',
      'folder-1',
      'beta|alpha',
      '0',
      'contains:0,sameFolder:1,sharedTag:0,similar:1',
      'auto',
      '5',
    ].join(';');

    expect(parseNotesGraphPersistKey(layoutKey)?.layoutMode).toBe('cluster');
    expect(parseNotesGraphPersistKey(layoutKey)?.showArchived).toBe(false);
  });

  it('returns null for malformed keys', () => {
    expect(parseNotesGraphPersistKey('bad-key')).toBeNull();
  });

  it('parses simplify override tokens', () => {
    const layoutKey = [
      '1:a',
      '',
      '',
      '1',
      '1',
      'contains:1,sameFolder:1,sharedTag:1,similar:1',
      'force',
      '1',
      '1',
    ].join(';');

    expect(parseNotesGraphPersistKey(layoutKey)?.simplifyOverride).toBe(true);
    expect(parseNotesGraphPersistKey(layoutKey)?.showArchived).toBe(true);
  });

  it('maps parsed keys back to graph filters', () => {
    const layoutKey = [
      '2:a,b',
      'folder-1',
      'beta|alpha',
      '1',
      '0',
      'contains:1,sameFolder:0,sharedTag:1,similar:0',
      'circular',
      '0',
      '5',
    ].join(';');
    const parsed = parseNotesGraphPersistKey(layoutKey)!;

    expect(parsedPersistKeyToGraphFilters(parsed)).toEqual({
      folderId: 'folder-1',
      tags: ['beta', 'alpha'],
      showTasks: true,
      showArchived: false,
      edgeVisibility: {
        contains: true,
        sameFolder: false,
        sharedTag: true,
        similar: false,
      },
      layoutMode: 'circular',
    });
  });

  it('returns null when layout mode token is invalid in a modern key', () => {
    const layoutKey = [
      '2:a,b',
      'folder-1',
      'beta|alpha',
      '0',
      '0',
      'contains:0,sameFolder:1,sharedTag:0,similar:1',
      'grid',
      'auto',
      '5',
    ].join(';');

    expect(parseNotesGraphPersistKey(layoutKey)).toBeNull();
  });

  it('returns null for malformed edge visibility segments', () => {
    const layoutKey = ['1:a', '', '', '1', '0', 'contains:1,invalid', 'cluster', 'auto', '1'].join(
      ';',
    );

    expect(parseNotesGraphPersistKey(layoutKey)).toBeNull();
  });
});
