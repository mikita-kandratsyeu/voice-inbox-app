import type { TranscriptSegment } from '@/entities/record';
import type { WhisperModelId, WhisperModelWeightsFormat } from '@/entities/settings';
import { getDocumentDirectoryPath, NitroFS } from '@/shared/lib/fs';
import { isNumber, isString } from '@/shared/lib/type-guards';

import type { TranscriptionChunkProfile } from './transcribeAudio';
import type { TranscriptionModelEngine } from './transcriptionModelEngine';

const CHECKPOINTS_DIR = `${getDocumentDirectoryPath()}/transcription-checkpoints`;
const CHECKPOINT_SCHEMA_VERSION = 3;
const CHECKPOINT_SCHEMA_VERSIONS = new Set([2, CHECKPOINT_SCHEMA_VERSION]);
const CHECKPOINT_TTL_MS = 12 * 60 * 60 * 1000;

export type TranscriptionCheckpoint = {
  schemaVersion: number;
  recordId: string;
  audioPath: string;
  modelId: WhisperModelId;
  modelFormat: WhisperModelWeightsFormat;
  language: string;
  chunkProfile: TranscriptionChunkProfile;
  totalChunks: number;
  lastCompletedChunkIndex: number;
  fullText: string;
  segments: TranscriptSegment[];
  updatedAt: number;
  engine?: TranscriptionModelEngine;
  nativeJobId?: string;
  detectedLanguage?: string;
};

const getCheckpointPath = (recordId: string): string => `${CHECKPOINTS_DIR}/${recordId}.json`;

const normalizeAudioPath = (path: string): string =>
  path.startsWith('file://') ? path.slice(7) : path;

const isValidChunkProfile = (value: unknown): value is TranscriptionChunkProfile =>
  typeof value === 'object' &&
  value != null &&
  'chunkDurationSec' in value &&
  'chunkOverlapSec' in value &&
  isNumber((value as TranscriptionChunkProfile).chunkDurationSec) &&
  isNumber((value as TranscriptionChunkProfile).chunkOverlapSec);

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
      !isNumber(parsed.schemaVersion) ||
      !CHECKPOINT_SCHEMA_VERSIONS.has(parsed.schemaVersion) ||
      !isString(parsed.recordId) ||
      !isString(parsed.audioPath) ||
      !isString(parsed.modelId) ||
      !isString(parsed.modelFormat) ||
      !isString(parsed.language) ||
      !isValidChunkProfile(parsed.chunkProfile) ||
      !isNumber(parsed.totalChunks) ||
      !isNumber(parsed.lastCompletedChunkIndex) ||
      !isString(parsed.fullText) ||
      !Array.isArray(parsed.segments) ||
      !isNumber(parsed.updatedAt)
    ) {
      return null;
    }

    return {
      schemaVersion: parsed.schemaVersion as number,
      recordId: parsed.recordId,
      audioPath: normalizeAudioPath(parsed.audioPath),
      modelId: parsed.modelId as WhisperModelId,
      modelFormat: parsed.modelFormat as WhisperModelWeightsFormat,
      language: parsed.language,
      chunkProfile: parsed.chunkProfile,
      totalChunks: parsed.totalChunks,
      lastCompletedChunkIndex: parsed.lastCompletedChunkIndex,
      fullText: parsed.fullText,
      segments: parsed.segments as TranscriptSegment[],
      updatedAt: parsed.updatedAt,
      engine: parsed.engine as TranscriptionModelEngine | undefined,
      nativeJobId: isString(parsed.nativeJobId) ? parsed.nativeJobId : undefined,
      detectedLanguage: isString(parsed.detectedLanguage) ? parsed.detectedLanguage : undefined,
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
          CHECKPOINT_SCHEMA_VERSIONS.has(x.schemaVersion ?? -1) &&
          isString(x.recordId) &&
          isString(x.audioPath) &&
          isString(x.modelId) &&
          isString(x.modelFormat) &&
          isString(x.language) &&
          isValidChunkProfile(x.chunkProfile) &&
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
        modelFormat: x.modelFormat as WhisperModelWeightsFormat,
        language: x.language as string,
        chunkProfile: x.chunkProfile as TranscriptionChunkProfile,
        totalChunks: x.totalChunks as number,
        lastCompletedChunkIndex: x.lastCompletedChunkIndex as number,
        fullText: x.fullText as string,
        segments: x.segments as TranscriptSegment[],
        updatedAt: x.updatedAt as number,
        engine: x.engine as TranscriptionModelEngine | undefined,
        nativeJobId: isString(x.nativeJobId) ? x.nativeJobId : undefined,
        detectedLanguage: isString(x.detectedLanguage) ? x.detectedLanguage : undefined,
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
