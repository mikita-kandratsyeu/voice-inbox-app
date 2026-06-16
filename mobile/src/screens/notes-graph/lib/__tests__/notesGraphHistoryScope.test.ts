import {
  buildNotesGraphHistoryScopePrefix,
  matchesNotesGraphHistoryScope,
  resolveLayoutKeyLookupCandidates,
  stripNotesGraphHistoryScopeFromLayoutKey,
} from '../notesGraphHistoryScope';

describe('notesGraphHistoryScope', () => {
  it('prefixes global and local scopes', () => {
    expect(buildNotesGraphHistoryScopePrefix({ kind: 'global' })).toBe('global');
    expect(buildNotesGraphHistoryScopePrefix({ kind: 'local', focusRecordId: 'rec-1' })).toBe(
      'local:rec-1',
    );
  });

  it('strips scoped prefixes while keeping legacy keys global', () => {
    expect(
      stripNotesGraphHistoryScopeFromLayoutKey('global;2:a,b;;0;0;0;0;linked:1;cluster;auto;2'),
    ).toEqual({
      scope: { kind: 'global' },
      bodyKey: '2:a,b;;0;0;0;0;linked:1;cluster;auto;2',
    });

    expect(
      stripNotesGraphHistoryScopeFromLayoutKey(
        'local:rec-1;2:a,b;;0;0;0;0;linked:1;cluster;auto;2',
      ),
    ).toEqual({
      scope: { kind: 'local', focusRecordId: 'rec-1' },
      bodyKey: '2:a,b;;0;0;0;0;linked:1;cluster;auto;2',
    });

    expect(
      stripNotesGraphHistoryScopeFromLayoutKey('2:a,b;;0;0;0;0;linked:1;cluster;auto;2'),
    ).toEqual({
      scope: { kind: 'global' },
      bodyKey: '2:a,b;;0;0;0;0;linked:1;cluster;auto;2',
    });
  });

  it('matches only entries from the same history scope', () => {
    const globalKey = 'global;2:a,b;;0;0;0;0;linked:1;cluster;auto;2';
    const localKey = 'local:rec-1;2:a,b;;0;0;0;0;linked:1;cluster;auto;2';
    const legacyKey = '2:a,b;;0;0;0;0;linked:1;cluster;auto;2';

    expect(matchesNotesGraphHistoryScope(globalKey, { kind: 'global' })).toBe(true);
    expect(matchesNotesGraphHistoryScope(legacyKey, { kind: 'global' })).toBe(true);
    expect(matchesNotesGraphHistoryScope(localKey, { kind: 'global' })).toBe(false);

    expect(matchesNotesGraphHistoryScope(localKey, { kind: 'local', focusRecordId: 'rec-1' })).toBe(
      true,
    );
    expect(matchesNotesGraphHistoryScope(localKey, { kind: 'local', focusRecordId: 'rec-2' })).toBe(
      false,
    );
    expect(
      matchesNotesGraphHistoryScope(globalKey, { kind: 'local', focusRecordId: 'rec-1' }),
    ).toBe(false);
  });

  it('resolves scoped and legacy layout key lookup candidates', () => {
    const scoped = 'global;2:a,b;;0;0;0;0;linked:1;cluster;auto;2';
    const legacy = '2:a,b;;0;0;0;0;linked:1;cluster;auto;2';

    expect(resolveLayoutKeyLookupCandidates(scoped)).toEqual([scoped, legacy]);
    expect(resolveLayoutKeyLookupCandidates(legacy)).toEqual([legacy]);
  });
});
