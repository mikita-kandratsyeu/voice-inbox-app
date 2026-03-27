import type { TranscriptSegment } from '@/entities/record';
import type { WhisperModelId } from '@/entities/settings';
import { getDocumentDirectoryPath, NitroFS } from '@/shared/lib/fs';

const CHECKPOINTS_DIR = `${getDocumentDirectoryPath()}/transcription-checkpoints`;
const CHECKPOINT_SCHEMA_VERSION = 1;
const CHECKPOINT_TTL_MS = 12 * 60 * 60 * 1000;

export type TranscriptionCheckpoint = {
  schemaVersion: number;
  recordId: string;
  audioPath: string;
  modelId: WhisperModelId;
  language: string;
  totalChunks: number;
  lastCompletedChunkIndex: number;
  fullText: string;
  segments: TranscriptSegment[];
  updatedAt: number;
};

const getCheckpointPath = (recordId: string): string => `${CHECKPOINTS_DIR}/${recordId}.json`;

const normalizeAudioPath = (path: string): string =>
  path.startsWith('file://') ? path.slice(7) : path;

const ensureCheckpointsDir = async (): Promise<void> => {
  const exists = await NitroFS.exists(CHECKPOINTS_DIR);

  if (!exists) {
    await NitroFS.mkdir(CHECKPOINTS_DIR);
  }
};

export const saveTranscriptionCheckpoint = async (
  checkpoint: Omit<TranscriptionCheckpoint, 'schemaVersion' | 'updatedAt'>,
): Promise<void> => {
  await ensureCheckpointsDir();
  const payload: TranscriptionCheckpoint = {
    ...checkpoint,
    schemaVersion: CHECKPOINT_SCHEMA_VERSION,
    audioPath: normalizeAudioPath(checkpoint.audioPath),
    updatedAt: Date.now(),
  };
  await NitroFS.writeFile(getCheckpointPath(checkpoint.recordId), JSON.stringify(payload), 'utf8');
};

export const getTranscriptionCheckpoint = async (
  recordId: string,
): Promise<TranscriptionCheckpoint | null> => {
  try {
    const path = getCheckpointPath(recordId);
    const exists = await NitroFS.exists(path);

    if (!exists) {
      return null;
    }

    const raw = await NitroFS.readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as Partial<TranscriptionCheckpoint>;

    if (
      parsed.schemaVersion !== CHECKPOINT_SCHEMA_VERSION ||
      typeof parsed.recordId !== 'string' ||
      typeof parsed.audioPath !== 'string' ||
      typeof parsed.modelId !== 'string' ||
      typeof parsed.language !== 'string' ||
      typeof parsed.totalChunks !== 'number' ||
      typeof parsed.lastCompletedChunkIndex !== 'number' ||
      typeof parsed.fullText !== 'string' ||
      !Array.isArray(parsed.segments) ||
      typeof parsed.updatedAt !== 'number'
    ) {
      return null;
    }

    return {
      schemaVersion: parsed.schemaVersion,
      recordId: parsed.recordId,
      audioPath: normalizeAudioPath(parsed.audioPath),
      modelId: parsed.modelId as WhisperModelId,
      language: parsed.language,
      totalChunks: parsed.totalChunks,
      lastCompletedChunkIndex: parsed.lastCompletedChunkIndex,
      fullText: parsed.fullText,
      segments: parsed.segments as TranscriptSegment[],
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
};

export const removeTranscriptionCheckpoint = async (recordId: string): Promise<void> => {
  const path = getCheckpointPath(recordId);
  const exists = await NitroFS.exists(path);

  if (!exists) {
    return;
  }

  await NitroFS.unlink(path);
};

export const listTranscriptionCheckpoints = async (): Promise<TranscriptionCheckpoint[]> => {
  try {
    const exists = await NitroFS.exists(CHECKPOINTS_DIR);

    if (!exists) {
      return [];
    }

    const entries = await NitroFS.readdir(CHECKPOINTS_DIR);
    const jsonFiles = [];

    for (const f of entries) {
      const st = await NitroFS.stat(f.path);
      if (st.isFile && f.name.endsWith('.json')) {
        jsonFiles.push(f);
      }
    }
    const records = await Promise.all(jsonFiles.map((f) => NitroFS.readFile(f.path, 'utf8')));

    const valid = records
      .map((raw) => {
        try {
          return JSON.parse(raw) as Partial<TranscriptionCheckpoint>;
        } catch {
          return null;
        }
      })
      .filter((x): x is Partial<TranscriptionCheckpoint> => x != null)
      .filter(
        (x) =>
          x.schemaVersion === CHECKPOINT_SCHEMA_VERSION &&
          typeof x.recordId === 'string' &&
          typeof x.audioPath === 'string' &&
          typeof x.modelId === 'string' &&
          typeof x.language === 'string' &&
          typeof x.totalChunks === 'number' &&
          typeof x.lastCompletedChunkIndex === 'number' &&
          typeof x.fullText === 'string' &&
          Array.isArray(x.segments) &&
          typeof x.updatedAt === 'number',
      )
      .map((x) => ({
        schemaVersion: x.schemaVersion as number,
        recordId: x.recordId as string,
        audioPath: normalizeAudioPath(x.audioPath as string),
        modelId: x.modelId as WhisperModelId,
        language: x.language as string,
        totalChunks: x.totalChunks as number,
        lastCompletedChunkIndex: x.lastCompletedChunkIndex as number,
        fullText: x.fullText as string,
        segments: x.segments as TranscriptSegment[],
        updatedAt: x.updatedAt as number,
      }));

    const now = Date.now();
    const fresh: TranscriptionCheckpoint[] = [];

    for (const item of valid) {
      if (now - item.updatedAt <= CHECKPOINT_TTL_MS) {
        fresh.push(item);
      } else {
        await removeTranscriptionCheckpoint(item.recordId).catch(() => {});
      }
    }

    return fresh.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
};
