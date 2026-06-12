export type RemoteSyncDiff = {
  added: number;
  updated: number;
  removed: number;
  notesAdded: number;
  notesUpdated: number;
  notesRemoved: number;
  hasChanges: boolean;
  deletionPaths: string[];
};

function isNoteMarkdownPath(path: string, normalizedPrefix: string): boolean {
  return path.startsWith(`${normalizedPrefix}/`) && path.endsWith('.md');
}

export function computeRemoteSyncDiff(params: {
  currentHashes: Record<string, string>;
  previousHashes: Record<string, string>;
  notePathPrefix: string;
}): RemoteSyncDiff {
  const { currentHashes, previousHashes, notePathPrefix } = params;
  const normalizedPrefix = notePathPrefix.replace(/^\/+|\/+$/g, '');

  let added = 0;
  let updated = 0;
  let removed = 0;
  let notesAdded = 0;
  let notesUpdated = 0;
  let notesRemoved = 0;
  const deletionPaths: string[] = [];

  const previousKeys = new Set(Object.keys(previousHashes));
  const currentKeys = new Set(Object.keys(currentHashes));

  for (const path of currentKeys) {
    const prev = previousHashes[path];
    const next = currentHashes[path];
    if (!prev) {
      if (isNoteMarkdownPath(path, normalizedPrefix)) {
        added += 1;
        notesAdded += 1;
      } else if (path.includes(`${normalizedPrefix}/`) || path.endsWith('manifest.json')) {
        added += 1;
      }
    } else if (prev !== next) {
      updated += 1;
      if (isNoteMarkdownPath(path, normalizedPrefix)) {
        notesUpdated += 1;
      }
    }
    previousKeys.delete(path);
  }

  for (const path of previousKeys) {
    if (isNoteMarkdownPath(path, normalizedPrefix)) {
      removed += 1;
      notesRemoved += 1;
      deletionPaths.push(path);
    }
  }

  const hasChanges = added > 0 || updated > 0 || removed > 0;

  return {
    added,
    updated,
    removed,
    notesAdded,
    notesUpdated,
    notesRemoved,
    hasChanges,
    deletionPaths,
  };
}

export function areRemoteSyncHashesEqual(
  current: Record<string, string>,
  previous: Record<string, string>,
): boolean {
  const currentKeys = Object.keys(current);
  const previousKeys = Object.keys(previous);
  if (currentKeys.length !== previousKeys.length) {
    return false;
  }
  for (const key of currentKeys) {
    if (current[key] !== previous[key]) {
      return false;
    }
  }
  return true;
}
