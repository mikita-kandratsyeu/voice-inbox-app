import { REMOTE_SYNC_LEGACY_MANIFEST_FILE, REMOTE_SYNC_MANIFEST_FILE } from './constants';

export function joinRepoPath(basePath: string, filePath: string): string {
  const normalized = basePath.replace(/^\/+|\/+$/g, '');
  if (!normalized) {
    return filePath;
  }
  return `${normalized}/${filePath.replace(/^\/+/, '')}`;
}

export function uniqueManifestPaths(basePath: string): string[] {
  return [
    joinRepoPath(basePath, REMOTE_SYNC_MANIFEST_FILE),
    REMOTE_SYNC_MANIFEST_FILE,
    joinRepoPath(basePath, REMOTE_SYNC_LEGACY_MANIFEST_FILE),
    REMOTE_SYNC_LEGACY_MANIFEST_FILE,
  ].filter((path, index, arr) => arr.indexOf(path) === index);
}

export function isNoteMarkdownPath(path: string): boolean {
  const normalized = path.replace(/^\/+/, '');
  return (
    normalized.endsWith('.md') &&
    (normalized.startsWith('notes/') || normalized.includes('/notes/'))
  );
}

export function isRemoteSyncAudioPath(path: string): boolean {
  const normalized = path.replace(/^\/+/, '');
  return normalized.startsWith('audio/') || normalized.includes('/audio/');
}

export function addPathVariants(out: Set<string>, path: string, basePath: string): void {
  const normalizedBase = basePath.replace(/^\/+|\/+$/g, '');
  out.add(path);
  if (normalizedBase && path.startsWith(`${normalizedBase}/`)) {
    out.add(path.slice(normalizedBase.length + 1));
  } else if (normalizedBase) {
    out.add(`${normalizedBase}/${path.replace(/^\/+/, '')}`);
  }
}

export function toRelativeRepoPaths(paths: readonly string[], basePath: string): Set<string> {
  const normalizedBase = basePath.replace(/^\/+|\/+$/g, '');
  return new Set(
    paths.map((path) => {
      if (normalizedBase && path.startsWith(`${normalizedBase}/`)) {
        return path.slice(normalizedBase.length + 1);
      }
      return path.replace(/^\/+/, '');
    }),
  );
}
