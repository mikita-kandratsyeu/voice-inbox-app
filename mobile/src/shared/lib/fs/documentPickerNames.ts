const MAX_IMPORT_FILE_NAME_LENGTH = 200;

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

function basenameFromPickerUri(uri: string): string {
  const path = stripUrlSuffix(stripFileScheme(uri));
  const segment = path.split('/').pop() ?? '';
  return decodePath(segment).trim();
}

/** Safe file name for moving picked files into the app sandbox (iOS is strict about path chars). */
export function sanitizePickerImportFileName(raw: string): string {
  const trimmed = raw.trim().replace(/\0/g, '');
  if (!trimmed) return 'imported-file';

  const safe = trimmed
    .replace(/[/\\]/g, '_')
    .replace(/[[\]]/g, '')
    .replace(/[<>:"|?*]/g, '_');
  if (safe.length <= MAX_IMPORT_FILE_NAME_LENGTH) return safe;

  const extMatch = safe.match(/(\.[^./\\]+)$/);
  const ext = extMatch?.[1] ?? '';
  const stemMax = MAX_IMPORT_FILE_NAME_LENGTH - ext.length;
  return safe.slice(0, Math.max(1, stemMax)) + ext;
}

export function resolvePickerImportFileName(file: { name?: string | null; uri: string }): string {
  const fromName = file.name?.trim();
  if (fromName) return sanitizePickerImportFileName(fromName);

  const fromUri = basenameFromPickerUri(file.uri);
  if (fromUri) return sanitizePickerImportFileName(fromUri);

  return 'imported-file';
}
