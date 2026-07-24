import { buildPublishedNoteShareMessage } from '../buildPublishedNoteShareMessage';

const t = (key: string, options?: Record<string, string>) => {
  if (key === 'share.publishShareMessageIntro') {
    return `"${options?.title}" — shared note from Voice Inbox AI`;
  }
  if (key === 'share.publishShareMessageExpires') {
    return `Link expires ${options?.date}.`;
  }
  if (key === 'share.publishShareLink') return 'Share link';
  return key;
};

describe('buildPublishedNoteShareMessage', () => {
  it('includes title context and URL', () => {
    expect(
      buildPublishedNoteShareMessage({
        title: 'Weekly sync',
        url: 'https://example.com/s/abc',
        expiresAt: null,
        formatExpiry: () => '',
        t,
      }),
    ).toBe('"Weekly sync" — shared note from Voice Inbox AI\n\nhttps://example.com/s/abc');
  });

  it('appends expiry line when set', () => {
    expect(
      buildPublishedNoteShareMessage({
        title: 'Weekly sync',
        url: 'https://example.com/s/abc',
        expiresAt: '2026-07-09T12:00:00.000Z',
        formatExpiry: () => '9 Jul 2026, 14:00',
        t,
      }),
    ).toBe(
      '"Weekly sync" — shared note from Voice Inbox AI\n\nhttps://example.com/s/abc\n\nLink expires 9 Jul 2026, 14:00.',
    );
  });

  it('returns empty string for blank URL', () => {
    expect(
      buildPublishedNoteShareMessage({
        title: 'Weekly sync',
        url: '   ',
        expiresAt: null,
        formatExpiry: () => '',
        t,
      }),
    ).toBe('');
  });
});
