import {
  formatWikiLinksForSharePdf,
  stripWikiLinksForShareDelivery,
} from './stripWikiLinksForShareDelivery';

describe('stripWikiLinksForShareDelivery', () => {
  it('replaces id|label wiki links with the label', () => {
    expect(
      stripWikiLinksForShareDelivery('- **Linked note:** [[rec_follow|Follow-up recap note]]'),
    ).toBe('- **Linked note:** Follow-up recap note');
  });

  it('replaces bare wiki links with the reference', () => {
    expect(stripWikiLinksForShareDelivery('See [[Alpha Note]]')).toBe('See Alpha Note');
  });
});

describe('formatWikiLinksForSharePdf', () => {
  it('replaces wiki links with styled markdown links', () => {
    expect(
      formatWikiLinksForSharePdf('- **Linked note:** [[rec_follow|Follow-up recap note]]'),
    ).toBe('- **Linked note:** [Follow-up recap note](vi-wiki-note)');
  });
});
