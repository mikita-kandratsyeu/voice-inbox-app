import type { DocumentPickerOptions } from '@react-native-documents/picker';
import { errorCodes, isErrorWithCode, keepLocalCopy, pick } from '@react-native-documents/picker';

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

  // Prefer fileCopyUri: local path after @react-native-documents/picker keepLocalCopy().
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

export type PickToCachesResult =
  | { kind: 'picked'; localUri: string; name: string | null }
  | { kind: 'canceled' }
  | { kind: 'failed'; message: string };

const SUBTITLE_CACHE_EXT = /\.(vtt|srt)(\?.*)?$/i;

/** Safe on-disk name for import copy; keeps original display name for UI and title. */
export function cacheFileNameForImportCopy(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return 'file';
  if (SUBTITLE_CACHE_EXT.test(trimmed)) {
    const ext = trimmed.toLowerCase().endsWith('.vtt') ? '.vtt' : '.srt';
    return `import-subtitle-${Date.now()}${ext}`;
  }
  return trimmed;
}

export async function pickSingleFileToCachesDirectory(
  pickOptions?: DocumentPickerOptions,
): Promise<PickToCachesResult> {
  try {
    const [file] = await pick(pickOptions);
    if (file.error) {
      return { kind: 'failed', message: file.error };
    }

    const displayName = file.name && file.name.trim().length > 0 ? file.name.trim() : 'file';
    const fileName = cacheFileNameForImportCopy(displayName);

    const toCopy: {
      uri: string;
      fileName: string;
      convertVirtualFileToType?: string;
    } = {
      uri: file.uri,
      fileName,
    };

    if (file.isVirtual && file.convertibleToMimeTypes?.length) {
      toCopy.convertVirtualFileToType = file.convertibleToMimeTypes[0].mimeType;
    }

    const [copyResult] = await keepLocalCopy({
      destination: 'cachesDirectory',
      files: [toCopy],
    });

    if (copyResult.status !== 'success') {
      return { kind: 'failed', message: copyResult.copyError };
    }

    return { kind: 'picked', localUri: copyResult.localUri, name: file.name };
  } catch (e: unknown) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) {
      return { kind: 'canceled' };
    }
    throw e;
  }
}

/** Copy a file:// or content:// URI into the app caches directory (Share sheet / Open in). */
export async function copyExternalUriToCachesForImport(
  uri: string,
  fileName: string,
): Promise<PickToCachesResult> {
  const safeName =
    fileName.trim().length > 0 ? cacheFileNameForImportCopy(fileName.trim()) : 'shared-audio.m4a';

  const [copyResult] = await keepLocalCopy({
    destination: 'cachesDirectory',
    files: [{ uri, fileName: safeName }],
  });

  if (copyResult.status !== 'success') {
    return { kind: 'failed', message: copyResult.copyError };
  }

  return { kind: 'picked', localUri: copyResult.localUri, name: safeName };
}
