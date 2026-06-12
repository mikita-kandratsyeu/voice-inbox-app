import dayjs from 'dayjs';

import type { GitlabSyncDiff } from './computeGitlabSyncDiff';

export function formatGitlabCommitMessage(params: {
  diff: GitlabSyncDiff;
  recordCount: number;
  folderCount: number;
  graphLayoutCount: number;
  syncedAt?: Date;
}): string {
  const { diff, recordCount, folderCount, graphLayoutCount, syncedAt = new Date() } = params;
  const stamp = dayjs(syncedAt).format('YYYY-MM-DD HH:mm');
  const lines = [`Voice Inbox AI sync — ${stamp}`, ''];

  const editParts: string[] = [];
  if (diff.added > 0) editParts.push(`+${diff.added} new`);
  if (diff.updated > 0) editParts.push(`~${diff.updated} edited`);
  if (diff.removed > 0) editParts.push(`-${diff.removed} removed`);
  const editSummary = editParts.length > 0 ? ` (${editParts.join(', ')})` : '';

  lines.push(`Notes: ${recordCount}${editSummary}`);
  lines.push(`Folders: ${folderCount}`);
  lines.push(`Graph layouts: ${graphLayoutCount}`);

  return lines.join('\n');
}
