import type { RecordListItem } from '@/entities/record';
import { NitroFS } from '@/shared/lib/fs';
import { RECORDINGS_DIR } from '@/shared/lib/recordings';
import { isNumber } from '@/shared/lib/type-guards';

const TEMP_WAV_TTL_MS = 12 * 60 * 60 * 1000;

function normalizePath(path: string): string {
  return path.startsWith('file://') ? path.slice(7) : path;
}

function getStatMtimeMs(stat: Awaited<ReturnType<typeof NitroFS.stat>>): number | null {
  const mtime = 'mtime' in stat ? stat.mtime : undefined;
  if (isNumber(mtime)) return mtime;
  return null;
}

export async function cleanupOrphanTranscriptionTempWavs(
  records: Pick<RecordListItem, 'audioPath'>[],
): Promise<void> {
  try {
    const exists = await NitroFS.exists(RECORDINGS_DIR);
    if (!exists) return;

    const referencedAudioPaths = new Set(
      records.map((record) => (record.audioPath ? normalizePath(record.audioPath) : null)),
    );

    const entries = await NitroFS.readdir(RECORDINGS_DIR);
    const now = Date.now();

    for (const entry of entries) {
      if (!entry.name.endsWith('.wav')) continue;
      if (referencedAudioPaths.has(entry.path)) continue;

      const stat = await NitroFS.stat(entry.path).catch(() => null);
      if (!stat?.isFile) continue;

      const mtimeMs = getStatMtimeMs(stat);
      if (mtimeMs != null && now - mtimeMs < TEMP_WAV_TTL_MS) continue;

      await NitroFS.unlink(entry.path).catch(() => {});
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[transcription] temp wav cleanup failed', err);
    }
  }
}
