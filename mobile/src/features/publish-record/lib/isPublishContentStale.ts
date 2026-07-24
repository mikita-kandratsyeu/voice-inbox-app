import type { VoiceRecord } from '@/entities/record';
import { buildShareText } from '@/features/share-record';

import type { PublishedNoteState } from '../model/types';
import { computeShareContentHash } from './computeShareContentHash';

/** Compare local note body to the hash stored at publish time. */
export function isPublishContentStale(record: VoiceRecord, published: PublishedNoteState): boolean {
  // List rows omit transcript segments until hydrateRecordDetails finishes; comparing
  // early would flash "note changed" even when content matches.
  if (!record.detailsHydrated) {
    return false;
  }

  const markdown = buildShareText(record, published.template, { forEmail: true });
  return computeShareContentHash(markdown) !== published.contentHash;
}
