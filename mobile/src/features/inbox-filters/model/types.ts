import type { RecordStatus } from '@/entities/record';

export type InboxFilterStatus = 'all' | Exclude<RecordStatus, 'unread'> | 'pinned';

export type InboxMenuFilterStatus =
  | 'unread'
  | 'withoutTranscript'
  | 'withoutSummary'
  | 'withoutTasks'
  | 'withTasks'
  | 'meetingMode'
  | 'processingError';

export type PrimaryFilterStatus = 'all' | 'pinned' | 'archived';

export type InboxSortOption = 'dateDesc' | 'dateAsc' | 'durationDesc' | 'durationAsc' | 'titleAsc';
