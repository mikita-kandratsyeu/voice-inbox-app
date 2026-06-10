import { getNotesGraphLayoutVersionDisplayName } from '../getNotesGraphLayoutVersionDisplayName';

const t = ((key: string, params?: Record<string, unknown>) => {
  if (key === 'notesGraph.history.versionLabel') {
    return `Version ${String(params?.version)}`;
  }
  return key;
}) as never;

describe('getNotesGraphLayoutVersionDisplayName', () => {
  it('returns trimmed custom name when present', () => {
    expect(
      getNotesGraphLayoutVersionDisplayName({ name: '  My layout  ', versionNumber: 3 }, t),
    ).toBe('My layout');
  });

  it('falls back to version label when name is empty', () => {
    expect(getNotesGraphLayoutVersionDisplayName({ name: '   ', versionNumber: 2 }, t)).toBe(
      'Version 2',
    );
    expect(getNotesGraphLayoutVersionDisplayName({ name: null, versionNumber: 2 }, t)).toBe(
      'Version 2',
    );
  });
});
