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

function isTextImportCacheFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith('.srt') ||
    lower.endsWith('.vtt') ||
    lower.endsWith('.sbv') ||
    lower.endsWith('.sub') ||
    lower.endsWith('.txt') ||
    lower.endsWith('.json') ||
    lower.endsWith('.md') ||
    lower.endsWith('.markdown')
  );
}

function decodeBase64ToUtf8(base64: string): string {
  const binary = atob(base64);
  let escaped = '';
  for (let i = 0; i < binary.length; i += 1) {
    escaped += `%${binary.charCodeAt(i).toString(16).padStart(2, '0')}`;
  }
  return decodeURIComponent(escaped);
}

function buildFsPathCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed.length) return [];

  const noScheme = stripFileScheme(trimmed);
  const noSuffix = stripUrlSuffix(noScheme).trim();
  const decoded = decodePath(noSuffix).trim();

  return Array.from(
    new Set(
      [noSuffix, decoded, trimmed, `file://${noSuffix}`, `file://${decoded}`].filter(
        (candidate) => candidate.length > 0,
      ),
    ),
  );
}

async function readUtf8FromFsCandidates(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    try {
      const text = await NitroFS.readFile(candidate, 'utf8');
      if (text.length > 0) return text;
    } catch {
      try {
        const base64 = await NitroFS.readFile(candidate, 'base64');
        const text = decodeBase64ToUtf8(base64);
        if (text.length > 0) return text;
      } catch {
        // try next candidate
      }
    }
  }
  return null;
}

async function verifyCopiedImportFile(destPath: string, fileName: string): Promise<boolean> {
  for (const candidate of buildFsPathCandidates(destPath)) {
    try {
      const stat = await NitroFS.stat(candidate);
      if (!stat.size || stat.size <= 0) continue;
      if (!isTextImportCacheFileName(fileName)) return true;

      const text = await readUtf8FromFsCandidates([candidate]);
      if (text) return true;
    } catch {
      // try next candidate
    }
  }
  return false;
}

async function acceptVerifiedCopy(
  result: PickToCachesResult | null,
  displayName: string,
): Promise<PickToCachesResult | null> {
  if (result?.kind !== 'picked') return null;

  const destPath = getDocumentPickerFsPath({ fileCopyUri: result.localUri });
  if (!destPath) return null;

  const cacheFileName = destPath.split('/').pop() ?? displayName;
  if (await verifyCopiedImportFile(destPath, cacheFileName)) {
    return { kind: 'picked', localUri: result.localUri, name: displayName };
  }

  return null;
}

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

  const normalizedCandidates = rawUris.flatMap((rawUri) => buildFsPathCandidates(rawUri));

  return findReadableFsPath(normalizedCandidates);
}

export type PickToCachesResult =
  | { kind: 'picked'; localUri: string; name: string | null }
  | { kind: 'canceled' }
  | { kind: 'failed'; message: string; fileAccessDenied?: boolean };

function isFileAccessDeniedMessage(message: string | null | undefined): boolean {
  if (!message?.trim()) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('permission') ||
    lower.includes('разрешен') ||
    lower.includes('cannot open file') ||
    lower.includes('не удалось открыть файл')
  );
}

async function tryUsePickerProvidedLocalFile(
  file: DocumentPickerResponse,
  displayName: string,
  cacheFileName: string,
): Promise<PickToCachesResult | null> {
  const pickerFile = file as DocumentPickerResponse & DocumentPickerLikeFile;
  const rawUris = [pickerFile.fileCopyUri, pickerFile.fileUri, pickerFile.uri].filter(
    (value): value is string => isString(value) && value.trim().length > 0,
  );

  for (const rawUri of rawUris) {
    for (const candidate of buildFsPathCandidates(rawUri)) {
      if (!(await verifyCopiedImportFile(candidate, cacheFileName))) continue;

      const localUri = candidate.startsWith('file://') ? candidate : `file://${candidate}`;
      return { kind: 'picked', localUri, name: displayName };
    }
  }

  return null;
}

async function copyPickerUriToCachesWithReadWrite(
  uri: string,
  fileName: string,
): Promise<PickToCachesResult | null> {
  if (!isTextImportCacheFileName(fileName)) return null;

  const text = await readUtf8FromFsCandidates(buildFsPathCandidates(uri));
  if (!text) return null;

  const destDir = `${getCachesDirectoryPath()}/${PICKER_IMPORT_DIR_PREFIX}${Date.now()}`;
  await NitroFS.mkdir(destDir);
  const destPath = `${destDir}/${fileName}`;
  const localUri = `file://${destPath}`;

  try {
    await NitroFS.writeFile(destPath, text, 'utf8');
    if (await NitroFS.exists(destPath)) {
      return { kind: 'picked', localUri, name: fileName };
    }
  } catch (err) {
    diagWarn('[pickSingleFileToCachesDirectory] read/write copy failed', { uri, destPath, err });
  }

  return null;
}

async function copyPickerUriToCachesWithNitro(
  uri: string,
  fileName: string,
): Promise<PickToCachesResult | null> {
  const destDir = `${getCachesDirectoryPath()}/${PICKER_IMPORT_DIR_PREFIX}${Date.now()}`;
  await NitroFS.mkdir(destDir);
  const destPath = `${destDir}/${fileName}`;
  const localUri = `file://${destPath}`;

  const sourceCandidates = buildFsPathCandidates(uri);

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
  options?: { metadataError?: string | null },
): Promise<PickToCachesResult> {
  const displayName = file.name?.trim() || fileName;
  const cacheFileName = sanitizePickerImportFileName(fileName);
  const copyStrategies: Array<() => Promise<PickToCachesResult | null>> = [];

  copyStrategies.push(() => tryUsePickerProvidedLocalFile(file, displayName, cacheFileName));
  copyStrategies.push(() => copyPickerUriToCachesWithReadWrite(file.uri, cacheFileName));

  if (options?.metadataError) {
    // iOS may report permission/metadata errors while the picked URI is still readable via fetch.
    copyStrategies.push(() => copyPickerUriToCachesWithFetch(file.uri, cacheFileName));
    copyStrategies.push(() => copyPickerUriToCachesWithNitro(file.uri, cacheFileName));
  }

  copyStrategies.push(async () => {
    const toCopy: {
      uri: string;
      fileName: string;
      convertVirtualFileToType?: string;
    } = {
      uri: file.uri,
      fileName: cacheFileName,
    };

    if (file.isVirtual && file.convertibleToMimeTypes?.length) {
      toCopy.convertVirtualFileToType = file.convertibleToMimeTypes[0].mimeType;
    }

    const [copyResult] = await keepLocalCopy({
      destination: 'cachesDirectory',
      files: [toCopy],
    });

    if (copyResult.status !== 'success') return null;
    return { kind: 'picked', localUri: copyResult.localUri, name: displayName };
  });

  if (!options?.metadataError) {
    copyStrategies.push(() => copyPickerUriToCachesWithReadWrite(file.uri, cacheFileName));
    copyStrategies.push(() => copyPickerUriToCachesWithNitro(file.uri, cacheFileName));
    copyStrategies.push(() => copyPickerUriToCachesWithFetch(file.uri, cacheFileName));
  }

  let lastError = 'Could not copy picked file into app sandbox';
  for (const strategy of copyStrategies) {
    try {
      const candidate = await strategy();
      const verified = await acceptVerifiedCopy(candidate, displayName);
      if (verified) return verified;
      if (candidate?.kind === 'failed') {
        lastError = candidate.message;
      }
    } catch (err) {
      diagWarn('[pickSingleFileToCachesDirectory] copy strategy failed', { err });
    }
  }

  if (options?.metadataError) {
    return {
      kind: 'failed',
      message: options.metadataError,
      fileAccessDenied: isFileAccessDeniedMessage(options.metadataError),
    };
  }

  return { kind: 'failed', message: lastError };
}

export async function readTextImportFileAtPath(path: string): Promise<string> {
  const text = await readUtf8FromFsCandidates(buildFsPathCandidates(path));
  if (text == null) {
    throw new Error('Failed to read text file');
  }
  return text;
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

    return copyPickedFileToCachesDirectory(file, resolvePickerImportFileName(file), {
      metadataError: file.error,
    });
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

  const strategies = [
    async () => {
      const [copyResult] = await keepLocalCopy({
        destination: 'cachesDirectory',
        files: [{ uri, fileName: safeName }],
      });
      if (copyResult.status !== 'success') {
        return { kind: 'failed' as const, message: copyResult.copyError };
      }
      return { kind: 'picked' as const, localUri: copyResult.localUri, name: safeName };
    },
    () => copyPickerUriToCachesWithReadWrite(uri, safeName),
    () => copyPickerUriToCachesWithNitro(uri, safeName),
    () => copyPickerUriToCachesWithFetch(uri, safeName),
  ];

  let lastError = 'Could not copy external file into app sandbox';
  for (const strategy of strategies) {
    try {
      const candidate = await strategy();
      const verified = await acceptVerifiedCopy(candidate, safeName);
      if (verified) return verified;
      if (candidate?.kind === 'failed') {
        lastError = candidate.message;
      }
    } catch (err) {
      diagWarn('[copyExternalUriToCachesForImport] copy strategy failed', { err });
    }
  }

  return { kind: 'failed', message: lastError };
}
