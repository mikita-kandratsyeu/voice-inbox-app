import type { DocumentPickerOptions, DocumentPickerResponse } from '@react-native-documents/picker';
import { errorCodes, isErrorWithCode, keepLocalCopy, pick } from '@react-native-documents/picker';

import { devWarn, diagWarn } from '@/shared/lib/appLogger';
import { isString } from '@/shared/lib/type-guards';

import { getCachesDirectoryPath, NitroFS } from './appFs';
import { resolvePickerImportFileName, sanitizePickerImportFileName } from './documentPickerNames';

export { resolvePickerImportFileName, sanitizePickerImportFileName } from './documentPickerNames';

type DocumentPickerLikeFile = {
  uri?: string | null;
  fileUri?: string | null;
  fileCopyUri?: string | null;
};

const PICKER_IMPORT_DIR_PREFIX = 'picker-import-';

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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
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
      devWarn('[getReadableDocumentPickerFsPath] candidate is not readable', { path: candidate });
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

async function copyPickerUriToCachesWithNitro(
  uri: string,
  fileName: string,
): Promise<PickToCachesResult | null> {
  const destDir = `${getCachesDirectoryPath()}/${PICKER_IMPORT_DIR_PREFIX}${Date.now()}`;
  await NitroFS.mkdir(destDir);
  const destPath = `${destDir}/${fileName}`;
  const localUri = `file://${destPath}`;

  const sourceCandidates = Array.from(
    new Set([uri, stripFileScheme(uri)].filter((candidate) => candidate.length > 0)),
  );

  for (const source of sourceCandidates) {
    try {
      await NitroFS.copyFile(source, destPath);
      if (await NitroFS.exists(destPath)) {
        return { kind: 'picked', localUri, name: fileName };
      }
    } catch (err) {
      diagWarn('[pickSingleFileToCachesDirectory] NitroFS.copyFile failed', {
        source,
        destPath,
        err,
      });
    }
  }

  return null;
}

async function copyPickerUriToCachesWithFetch(
  uri: string,
  fileName: string,
): Promise<PickToCachesResult | null> {
  try {
    const response = await fetch(uri);
    if (!response.ok) return null;

    const destDir = `${getCachesDirectoryPath()}/${PICKER_IMPORT_DIR_PREFIX}${Date.now()}`;
    await NitroFS.mkdir(destDir);
    const destPath = `${destDir}/${fileName}`;
    const localUri = `file://${destPath}`;

    const lowerName = fileName.toLowerCase();
    const looksText =
      lowerName.endsWith('.srt') ||
      lowerName.endsWith('.vtt') ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.json');

    if (looksText) {
      const text = await response.text();
      await NitroFS.writeFile(destPath, text, 'utf8');
    } else {
      const base64 = arrayBufferToBase64(await response.arrayBuffer());
      await NitroFS.writeFile(destPath, base64, 'base64');
    }

    if (await NitroFS.exists(destPath)) {
      return { kind: 'picked', localUri, name: fileName };
    }
  } catch (err) {
    diagWarn('[pickSingleFileToCachesDirectory] fetch copy failed', { uri, err });
  }

  return null;
}

async function copyPickedFileToCachesDirectory(
  file: DocumentPickerResponse,
  fileName: string,
): Promise<PickToCachesResult> {
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

  if (copyResult.status === 'success') {
    return { kind: 'picked', localUri: copyResult.localUri, name: file.name ?? fileName };
  }

  const nitroCopy = await copyPickerUriToCachesWithNitro(file.uri, fileName);
  if (nitroCopy?.kind === 'picked') {
    return { kind: 'picked', localUri: nitroCopy.localUri, name: file.name ?? fileName };
  }

  const fetchCopy = await copyPickerUriToCachesWithFetch(file.uri, fileName);
  if (fetchCopy?.kind === 'picked') {
    return { kind: 'picked', localUri: fetchCopy.localUri, name: file.name ?? fileName };
  }

  return { kind: 'failed', message: copyResult.copyError };
}

export async function pickSingleFileToCachesDirectory(
  pickOptions?: DocumentPickerOptions,
): Promise<PickToCachesResult> {
  try {
    const [file] = await pick({
      mode: 'import',
      ...pickOptions,
    });

    if (!file.uri?.trim()) {
      return {
        kind: 'failed',
        message: file.error ?? 'Picker returned an empty file URI',
      };
    }

    // iOS can return `error` when metadata (name/size) is unreadable, while the picked URI is still valid.
    if (file.error) {
      devWarn(
        '[pickSingleFileToCachesDirectory] metadata warning, attempting local copy anyway',
        file.error,
      );
    }

    return copyPickedFileToCachesDirectory(file, resolvePickerImportFileName(file));
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
  const safeName = sanitizePickerImportFileName(
    fileName.trim().length > 0 ? fileName.trim() : 'shared-audio.m4a',
  );

  const [copyResult] = await keepLocalCopy({
    destination: 'cachesDirectory',
    files: [{ uri, fileName: safeName }],
  });

  if (copyResult.status === 'success') {
    return { kind: 'picked', localUri: copyResult.localUri, name: safeName };
  }

  const nitroCopy = await copyPickerUriToCachesWithNitro(uri, safeName);
  if (nitroCopy?.kind === 'picked') {
    return { kind: 'picked', localUri: nitroCopy.localUri, name: safeName };
  }

  const fetchCopy = await copyPickerUriToCachesWithFetch(uri, safeName);
  if (fetchCopy?.kind === 'picked') {
    return { kind: 'picked', localUri: fetchCopy.localUri, name: safeName };
  }

  return { kind: 'failed', message: copyResult.copyError };
}
