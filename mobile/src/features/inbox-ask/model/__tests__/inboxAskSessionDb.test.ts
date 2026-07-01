import { buildInboxAskSessionKey } from '../../lib/buildInboxAskSessionKey';

describe('buildInboxAskSessionKey', () => {
  it('uses default for active notes without folder or date range', () => {
    expect(buildInboxAskSessionKey()).toBe('default');
    expect(buildInboxAskSessionKey({ includeArchived: false })).toBe('default');
  });

  it('isolates archived-all-notes scope from active default', () => {
    expect(buildInboxAskSessionKey({ includeArchived: true })).toBe('default|archived');
  });

  it('includes folder and archive mode in the key', () => {
    expect(
      buildInboxAskSessionKey({
        folderId: 'folder-a',
        includeArchived: false,
      }),
    ).toBe('folder-a|||active');
    expect(
      buildInboxAskSessionKey({
        folderId: 'folder-a',
        includeArchived: true,
      }),
    ).toBe('folder-a|||all');
  });

  it('includes date range segments when provided', () => {
    expect(
      buildInboxAskSessionKey({
        fromIso: '2026-01-01T00:00:00.000Z',
        toIso: '2026-12-31T23:59:59.999Z',
        includeArchived: true,
      }),
    ).toBe('|2026-01-01T00:00:00.000Z|2026-12-31T23:59:59.999Z|all');
  });
});
