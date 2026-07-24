import { useCallback, useState } from 'react';

import {
  getInboxAskFolderId,
  getInboxAskIncludeArchived,
  setInboxAskFolderId,
  setInboxAskIncludeArchived,
} from './inboxAskCorpusPreferences';

function resolveInitialFolderId(initialFolderId?: string | null): string | null {
  if (initialFolderId) return initialFolderId;
  return getInboxAskFolderId();
}

export function useInboxAskCorpusScope(initialFolderId?: string | null) {
  const [includeArchived, setIncludeArchivedState] = useState(() => getInboxAskIncludeArchived());
  const [folderId, setFolderIdState] = useState<string | null>(() =>
    resolveInitialFolderId(initialFolderId),
  );

  const setIncludeArchived = useCallback((next: boolean) => {
    setInboxAskIncludeArchived(next);
    setIncludeArchivedState(next);
  }, []);

  const setFolderId = useCallback((next: string | null) => {
    setInboxAskFolderId(next);
    setFolderIdState(next);
  }, []);

  return { includeArchived, setIncludeArchived, folderId, setFolderId };
}
