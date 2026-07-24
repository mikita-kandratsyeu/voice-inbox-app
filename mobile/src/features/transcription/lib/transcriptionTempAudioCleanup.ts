import type { RecordListItem } from '@/entities/record';
import { diagWarn } from '@/shared/lib/appLogger';
import { NitroFS } from '@/shared/lib/fs';
import { RECORDINGS_DIR, resolveAudioPath } from '@/shared/lib/recordings';
import { isNumber } from '@/shared/lib/type-guards';

const TEMP_WAV_TTL_MS = 12 * 60 * 60 * 1000;

function normalizePath(path: string): string {
  const resolved = resolveAudioPath(path);
  return resolved.startsWith('file://') ? resolved.slice(7) : resolved;
}

function recordIdFromWavName(name: string): string | null {
  const match = name.match(/^(rec_[A-Za-z0-9_]+)\.wav$/);
  return match?.[1] ?? null;
}

function isTranscriptionChunkWav(name: string): boolean {
  return /\.wav\.chunk-\d+\.wav$/.test(name);
}

function isPermanentRecordWav(record: Pick<RecordListItem, 'id' | 'audioPath'>): boolean {
  if (!record.audioPath?.trim()) return false;
  const resolved = normalizePath(record.audioPath).toLowerCase();
  if (!resolved.endsWith('.wav')) return false;
  return resolved.endsWith(`/${record.id}.wav`) || resolved.endsWith(`${record.id}.wav`);
}

function getStatMtimeMs(stat: Awaited<ReturnType<typeof NitroFS.stat>>): number | null {
  const mtime = 'mtime' in stat ? stat.mtime : undefined;
  if (isNumber(mtime)) return mtime;
  return null;
}

export async function cleanupOrphanTranscriptionTempWavs(
  records: Pick<RecordListItem, 'id' | 'audioPath'>[],
): Promise<void> {
  try {
    const exists = await NitroFS.exists(RECORDINGS_DIR);
    if (!exists) return;

    const referencedAudioPaths = new Set(
      records
        .map((record) => (record.audioPath ? normalizePath(record.audioPath) : null))
        .filter((path): path is string => path != null),
    );
    const permanentWavRecordIds = new Set(
      records.filter(isPermanentRecordWav).map((record) => record.id),
    );

    const entries = await NitroFS.readdir(RECORDINGS_DIR);
    const now = Date.now();

    for (const entry of entries) {
      if (!entry.name.endsWith('.wav')) continue;
      if (isTranscriptionChunkWav(entry.name)) {
        await NitroFS.unlink(entry.path).catch(() => {});
        continue;
      }

      const entryPathNorm = normalizePath(entry.path);
      const recordIdFromName = recordIdFromWavName(entry.name);
      if (referencedAudioPaths.has(entry.path) || referencedAudioPaths.has(entryPathNorm)) continue;
      if (recordIdFromName && permanentWavRecordIds.has(recordIdFromName)) {
        continue;
      }

      const stat = await NitroFS.stat(entry.path).catch(() => null);
      if (!stat?.isFile) continue;

      const mtimeMs = getStatMtimeMs(stat);
      if (mtimeMs != null && now - mtimeMs < TEMP_WAV_TTL_MS) continue;

      await NitroFS.unlink(entry.path).catch(() => {});
    }
  } catch (err) {
    diagWarn('[transcription] temp wav cleanup failed', err);
  }
}
