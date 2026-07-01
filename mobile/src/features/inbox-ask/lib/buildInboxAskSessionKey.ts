import type { InboxAskRetrievalScope } from '@/features/inbox-ask-retrieval';

export function buildInboxAskSessionKey(scope?: InboxAskRetrievalScope): string {
  const folderId = scope?.folderId ?? '';
  const fromIso = scope?.fromIso ?? '';
  const toIso = scope?.toIso ?? '';
  const archive = scope?.includeArchived ? 'all' : 'active';

  if (!folderId && !fromIso && !toIso) {
    return archive === 'all' ? 'default|archived' : 'default';
  }
  return [folderId, fromIso, toIso, archive].join('|');
}
