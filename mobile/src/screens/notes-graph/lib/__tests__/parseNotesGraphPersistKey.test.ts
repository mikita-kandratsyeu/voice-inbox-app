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
      'contains:1,sameFolder:1,sharedTag:1,similar:1',
      'force',
      '1',
      '1',
    ].join(';');

    expect(parseNotesGraphPersistKey(layoutKey)?.simplifyOverride).toBe(true);
  });
});
