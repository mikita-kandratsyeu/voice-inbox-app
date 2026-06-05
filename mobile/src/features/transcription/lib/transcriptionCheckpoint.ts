import type { TranscriptSegment } from '@/entities/record';
import type { WhisperModelId } from '@/entities/settings';
import { getDocumentDirectoryPath, NitroFS } from '@/shared/lib/fs';
import { isNumber, isString } from '@/shared/lib/type-guards';

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

const checkpointWriteInFlightByRecordId = new Map<string, Promise<void>>();

const waitForCheckpointWrite = async (recordId: string): Promise<void> => {
  await checkpointWriteInFlightByRecordId.get(recordId)?.catch(() => {});
};

const ensureCheckpointsDir = async (): Promise<void> => {
  const exists = await NitroFS.exists(CHECKPOINTS_DIR);

  if (!exists) {
    await NitroFS.mkdir(CHECKPOINTS_DIR);
  }
};

export const saveTranscriptionCheckpoint = async (
  checkpoint: Omit<TranscriptionCheckpoint, 'schemaVersion' | 'updatedAt'>,
): Promise<void> => {
  const previousWrite = checkpointWriteInFlightByRecordId.get(checkpoint.recordId);
  const write = (async () => {
    await previousWrite?.catch(() => {});
    await ensureCheckpointsDir();
    const payload: TranscriptionCheckpoint = {
      ...checkpoint,
      schemaVersion: CHECKPOINT_SCHEMA_VERSION,
      audioPath: normalizeAudioPath(checkpoint.audioPath),
      updatedAt: Date.now(),
    };
    await NitroFS.writeFile(
      getCheckpointPath(checkpoint.recordId),
      JSON.stringify(payload),
      'utf8',
    );
  })();

  checkpointWriteInFlightByRecordId.set(checkpoint.recordId, write);

  try {
    await write;
  } finally {
    if (checkpointWriteInFlightByRecordId.get(checkpoint.recordId) === write) {
      checkpointWriteInFlightByRecordId.delete(checkpoint.recordId);
    }
  }
};

export const getTranscriptionCheckpoint = async (
  recordId: string,
): Promise<TranscriptionCheckpoint | null> => {
  try {
    await waitForCheckpointWrite(recordId);

    const path = getCheckpointPath(recordId);
    const exists = await NitroFS.exists(path);

    if (!exists) {
      return null;
    }

    const raw = await NitroFS.readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as Partial<TranscriptionCheckpoint>;

    if (
      parsed.schemaVersion !== CHECKPOINT_SCHEMA_VERSION ||
      !isString(parsed.recordId) ||
      !isString(parsed.audioPath) ||
      !isString(parsed.modelId) ||
      !isString(parsed.language) ||
      !isNumber(parsed.totalChunks) ||
      !isNumber(parsed.lastCompletedChunkIndex) ||
      !isString(parsed.fullText) ||
      !Array.isArray(parsed.segments) ||
      !isNumber(parsed.updatedAt)
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
  await waitForCheckpointWrite(recordId);

  const path = getCheckpointPath(recordId);
  const exists = await NitroFS.exists(path);

  if (!exists) {
    return;
  }

  await NitroFS.unlink(path);
};

export const listTranscriptionCheckpoints = async (): Promise<TranscriptionCheckpoint[]> => {
  try {
    await Promise.all(
      [...checkpointWriteInFlightByRecordId.values()].map((write) => write.catch(() => {})),
    );

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
          isString(x.recordId) &&
          isString(x.audioPath) &&
          isString(x.modelId) &&
          isString(x.language) &&
          isNumber(x.totalChunks) &&
          isNumber(x.lastCompletedChunkIndex) &&
          isString(x.fullText) &&
          Array.isArray(x.segments) &&
          isNumber(x.updatedAt),
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
