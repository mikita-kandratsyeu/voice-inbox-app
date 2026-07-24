export const REMOTE_SYNC_MAX_PINNED_REPOS = 3;

export type ToggleRemoteSyncPinnedRepoResult =
  | { ok: true; pinned: string[] }
  | { ok: false; reason: 'max' };

export function toggleRemoteSyncPinnedRepo(
  current: readonly string[],
  fullName: string,
): ToggleRemoteSyncPinnedRepoResult {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { ok: true, pinned: [...current] };
  }

  const index = current.indexOf(trimmed);
  if (index >= 0) {
    return { ok: true, pinned: current.filter((name) => name !== trimmed) };
  }

  if (current.length >= REMOTE_SYNC_MAX_PINNED_REPOS) {
    return { ok: false, reason: 'max' };
  }

  return { ok: true, pinned: [...current, trimmed] };
}

export function pruneRemoteSyncPinnedRepos(
  pinned: readonly string[],
  availableFullNames: readonly string[],
): string[] {
  const available = new Set(availableFullNames);
  return pinned.filter((name) => available.has(name));
}
