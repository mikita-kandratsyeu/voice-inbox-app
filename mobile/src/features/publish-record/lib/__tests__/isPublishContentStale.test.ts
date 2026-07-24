import type { VoiceRecord } from '@/entities/record';
import type { PublishedNoteState } from '@/features/publish-record/model/types';

import { isPublishContentStale } from '../isPublishContentStale';

jest.mock('@/features/share-record', () => ({
  buildShareText: jest.fn(() => 'share-markdown'),
}));

jest.mock('../computeShareContentHash', () => ({
  computeShareContentHash: jest.fn(() => 'local-hash'),
}));

describe('isPublishContentStale', () => {
  const published = {
    recordId: 'rec-1',
    shareToken: 'token',
    shareUrl: 'https://example.com/s/token',
    template: 'noteBrief',
    contentHash: 'published-hash',
    publishedAt: '2026-06-01T00:00:00.000Z',
    expiresAt: null,
    updatedAt: '2026-06-01T00:00:00.000Z',
  } satisfies PublishedNoteState;

  it('returns false before record details are hydrated', () => {
    const record = { id: 'rec-1', detailsHydrated: false } as VoiceRecord;

    expect(isPublishContentStale(record, published)).toBe(false);
  });

  it('returns true when hydrated content hash differs from published hash', () => {
    const record = { id: 'rec-1', detailsHydrated: true } as VoiceRecord;

    expect(isPublishContentStale(record, published)).toBe(true);
  });

  it('returns false when hydrated content hash matches published hash', () => {
    const record = { id: 'rec-1', detailsHydrated: true } as VoiceRecord;
    const matching = { ...published, contentHash: 'local-hash' };

    expect(isPublishContentStale(record, matching)).toBe(false);
  });
});
