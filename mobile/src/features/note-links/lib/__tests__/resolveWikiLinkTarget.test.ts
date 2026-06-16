import { buildWikiLinkIndex, resolveWikiLinkTarget } from '../resolveWikiLinkTarget';

const baseRecord = (overrides: Partial<Parameters<typeof buildWikiLinkIndex>[0][number]> = {}) => ({
  id: 'rec_1_aaa',
  title: 'Meeting Notes',
  status: 'unread' as const,
  createdAt: '2026-01-01T10:00:00.000Z',
  ...overrides,
});

describe('resolveWikiLinkTarget', () => {
  it('resolves by record id', () => {
    const index = buildWikiLinkIndex([baseRecord()]);
    expect(resolveWikiLinkTarget('rec_1_aaa', index)).toBe('rec_1_aaa');
  });

  it('resolves by title case-insensitively', () => {
    const index = buildWikiLinkIndex([baseRecord({ title: 'Project Alpha' })]);
    expect(resolveWikiLinkTarget('project alpha', index)).toBe('rec_1_aaa');
  });

  it('picks the earliest createdAt when titles duplicate', () => {
    const index = buildWikiLinkIndex([
      baseRecord({ id: 'rec_2_bbb', createdAt: '2026-01-02T10:00:00.000Z' }),
      baseRecord({ id: 'rec_1_aaa', createdAt: '2026-01-01T10:00:00.000Z' }),
    ]);

    expect(resolveWikiLinkTarget('Meeting Notes', index)).toBe('rec_1_aaa');
  });

  it('returns null for archived records', () => {
    const index = buildWikiLinkIndex([baseRecord({ status: 'archived' })]);
    expect(resolveWikiLinkTarget('rec_1_aaa', index)).toBeNull();
    expect(resolveWikiLinkTarget('Meeting Notes', index)).toBeNull();
  });

  it('returns null when not found', () => {
    const index = buildWikiLinkIndex([baseRecord()]);
    expect(resolveWikiLinkTarget('Missing Note', index)).toBeNull();
    expect(resolveWikiLinkTarget('not_an_id', index)).toBeNull();
  });
});
