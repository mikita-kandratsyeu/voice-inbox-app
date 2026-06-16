import { buildNoteInternalLinkUrl } from '../noteInternalLinkScheme';
import { transformWikiLinksForRender } from '../transformWikiLinksForRender';

const records = [
  {
    id: 'rec_1_aaa',
    title: 'Alpha Note',
    status: 'unread',
    createdAt: '2026-01-01T10:00:00.000Z',
  },
  {
    id: 'rec_2_bbb',
    title: 'Beta Note',
    status: 'unread',
    createdAt: '2026-01-02T10:00:00.000Z',
  },
];

describe('transformWikiLinksForRender', () => {
  it('transforms title and id wiki links in one paragraph', () => {
    const input = 'See [[Alpha Note]] and [[rec_2_bbb|Beta alias]].';
    const output = transformWikiLinksForRender(input, records);

    expect(output).toBe(
      `See [Alpha Note](${buildNoteInternalLinkUrl('rec_1_aaa')}) and [Beta alias](${buildNoteInternalLinkUrl('rec_2_bbb')}).`,
    );
  });

  it('leaves unresolved wiki links as plain text', () => {
    const input = 'Unknown [[Missing Note]] stays.';
    expect(transformWikiLinksForRender(input, records)).toBe(input);
  });

  it('transforms explicit id links for archived records', () => {
    const archivedRecords = [
      {
        id: 'rec_1774517044783_7a9eu',
        title: 'Archived target',
        status: 'archived',
        createdAt: '2026-01-01T10:00:00.000Z',
      },
    ];
    const input = '- [[rec_1774517044783_7a9eu|Обмен тикетами]]';

    expect(transformWikiLinksForRender(input, archivedRecords)).toBe(
      `- [Обмен тикетами](${buildNoteInternalLinkUrl('rec_1774517044783_7a9eu')})`,
    );
  });
});
