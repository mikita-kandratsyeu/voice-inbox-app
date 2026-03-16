import type { RecordClassification, RecordStatus } from '@/entities/record';

export type InboxFilterStatus =
  | 'all'
  | Exclude<RecordStatus, 'unread'>
  | 'pinned'
  | 'withoutTranscript'
  | 'withoutSummary'
  | RecordClassification;

export type PrimaryFilterStatus = 'all' | 'pinned' | 'archived';

export type InboxSortOption = 'dateDesc' | 'dateAsc' | 'durationDesc' | 'durationAsc' | 'titleAsc';
