import { getCachesDirectoryPath, NitroFS, readUtf8WithAllFallbacks } from '@/shared/lib/fs';

import { subtitleFormatFromFileName } from './isSubtitleImportFile';

function stripFileScheme(uri: string): string {
  return uri.startsWith('file://') ? uri.slice(7) : uri;
}

function collectReadCandidates(sourcePath: string, localUri: string | null): string[] {
  const out: string[] = [];
  const add = (raw: string | null | undefined) => {
    if (!raw?.trim()) return;
    const trimmed = raw.trim();
    out.push(trimmed);
    if (trimmed.startsWith('file://')) {
      out.push(stripFileScheme(trimmed));
    } else {
      out.push(`file://${trimmed}`);
    }
  };
  add(sourcePath);
  add(localUri);
  return [...new Set(out)];
}

/** Read subtitle text from picker paths; copies to a safe name if direct reads fail. */
export async function readPickedSubtitleUtf8(
  sourcePath: string,
  localUri: string,
  originalFileName?: string | null,
): Promise<string> {
  const candidates = collectReadCandidates(sourcePath, localUri);
  let lastErr: unknown;

  for (const candidate of candidates) {
    try {
      return await readUtf8WithAllFallbacks(candidate);
    } catch (err) {
      lastErr = err;
    }
  }

  const ext = subtitleFormatFromFileName(originalFileName) === 'vtt' ? '.vtt' : '.srt';
  const safePath = `${getCachesDirectoryPath()}/import-subtitle-${Date.now()}${ext}`;
  for (const candidate of candidates) {
    try {
      await NitroFS.copyFile(candidate, safePath);
      const text = await readUtf8WithAllFallbacks(safePath);
      try {
        await NitroFS.unlink(safePath);
      } catch {
        /* best-effort cleanup */
      }
      return text;
    } catch (copyErr) {
      lastErr = copyErr;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('subtitle read failed');
}
