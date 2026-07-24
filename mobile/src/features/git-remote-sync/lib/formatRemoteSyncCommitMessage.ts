import dayjs from 'dayjs';

import type { RemoteSyncDiff } from './computeRemoteSyncDiff';

function noteLabel(count: number): string {
  return count === 1 ? 'note' : 'notes';
}

function formatNoteChangeSummary(diff: RemoteSyncDiff): string[] {
  const parts: string[] = [];
  if (diff.notesAdded > 0) parts.push(`${diff.notesAdded} new`);
  if (diff.notesUpdated > 0) parts.push(`${diff.notesUpdated} edited`);
  if (diff.notesRemoved > 0) parts.push(`${diff.notesRemoved} removed`);
  return parts;
}

function formatCommitSubject(diff: RemoteSyncDiff, recordCount: number): string {
  const changes = formatNoteChangeSummary(diff);
  const label = noteLabel(recordCount);
  if (changes.length > 0) {
    return `sync: ${changes.join(', ')} (${recordCount} ${label})`;
  }
  if (diff.hasChanges) {
    return `sync: refresh backup (${recordCount} ${label})`;
  }
  return `sync: backup ${recordCount} ${label}`;
}

function formatMetadataSummary(folderCount: number, graphLayoutCount: number): string | null {
  const parts: string[] = [];
  if (folderCount > 0) {
    parts.push(`${folderCount} ${folderCount === 1 ? 'folder' : 'folders'}`);
  }
  if (graphLayoutCount > 0) {
    parts.push(`${graphLayoutCount} graph ${graphLayoutCount === 1 ? 'layout' : 'layouts'}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function formatRemoteSyncCommitMessage(params: {
  diff: RemoteSyncDiff;
  recordCount: number;
  folderCount: number;
  graphLayoutCount: number;
  syncedAt?: Date;
}): string {
  const { diff, recordCount, folderCount, graphLayoutCount, syncedAt = new Date() } = params;
  const stamp = dayjs(syncedAt).format('YYYY-MM-DD HH:mm');
  const lines = [formatCommitSubject(diff, recordCount), '', `Voice Inbox AI · ${stamp}`];
  const metadata = formatMetadataSummary(folderCount, graphLayoutCount);
  if (metadata) {
    lines.push(metadata);
  }
  return lines.join('\n');
}
