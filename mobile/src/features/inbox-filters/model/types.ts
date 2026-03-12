import type { RecordStatus } from '@/entities/record';

export type InboxFilterStatus =
  | 'all'
  | Exclude<RecordStatus, 'unread'>
  | 'pinned'
  | 'withoutTranscript';
export type InboxSortOption = 'dateDesc' | 'dateAsc' | 'durationDesc' | 'durationAsc' | 'titleAsc';
