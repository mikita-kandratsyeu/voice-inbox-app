import type { ShareBriefTemplate } from '@/features/share-record';

export type PublishExpiryPreset = '1d' | '7d' | '30d' | 'never';

export type PublishedNoteState = {
  recordId: string;
  shareToken: string;
  shareUrl: string;
  template: ShareBriefTemplate;
  contentHash: string;
  publishedAt: string;
  expiresAt: string | null;
  updatedAt: string;
};
