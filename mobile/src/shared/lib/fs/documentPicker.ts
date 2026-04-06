import { isString } from '@/shared/lib/type-guards';

import { NitroFS } from './appFs';

type DocumentPickerLikeFile = {
  uri?: string | null;
  fileUri?: string | null;
  fileCopyUri?: string | null;
};

function stripFileScheme(uri: string): string {
  return uri.startsWith('file://') ? uri.slice(7) : uri;
}

function stripUrlSuffix(path: string): string {
  return path.split('?')[0]?.split('#')[0] ?? path;
}

function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export function getDocumentPickerFsPath(
  file: DocumentPickerLikeFile | null | undefined,
): string | null {
  if (!file) return null;

  // fileCopyUri is the canonical local path provided by react-native-document-picker when copyTo is used.
  const rawUri = file.fileCopyUri ?? file.fileUri ?? file.uri;
  if (!rawUri) return null;

  const noScheme = stripFileScheme(rawUri);
  const noSuffix = stripUrlSuffix(noScheme);
  const normalized = decodePath(noSuffix).trim();

  return normalized.length > 0 ? normalized : null;
}

async function findReadableFsPath(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const exists = await NitroFS.exists(candidate);
      if (exists) return candidate;
    } catch {
      if (__DEV__) {
        console.warn('[getReadableDocumentPickerFsPath] candidate is not readable', candidate);
      }
    }
  }
  return null;
}

export async function getReadableDocumentPickerFsPath(
  file: DocumentPickerLikeFile | null | undefined,
): Promise<string | null> {
  if (!file) return null;

  const rawUris = [file.fileCopyUri, file.fileUri, file.uri].filter(
    (v): v is string => isString(v) && v.trim().length > 0,
  );

  if (rawUris.length === 0) return null;

  const normalizedCandidates = rawUris.flatMap((rawUri) => {
    const noScheme = stripFileScheme(rawUri).trim();
    const noSuffix = stripUrlSuffix(noScheme).trim();
    const decoded = decodePath(noSuffix).trim();
    return Array.from(new Set([decoded, noSuffix])).filter((v) => v.length > 0);
  });

  return findReadableFsPath(normalizedCandidates);
}
