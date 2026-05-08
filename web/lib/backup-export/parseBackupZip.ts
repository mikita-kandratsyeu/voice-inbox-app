import { BlobReader, TextWriter, Uint8ArrayWriter, ZipReader } from '@zip.js/zip.js';

import { MAX_BACKUP_ZIP_BYTES } from './constants';
import {
  EXPORT_MAX_RECORD_TEXT_CHARS,
  ExportPayloadV3EnvelopeSchema,
  VoiceRecordSchema,
} from './schema';
import type { ParsedBackup, ParsedFolder, ParsedRecord, ParsedTask } from './types';

export class BackupZipParseError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'too_large'
      | 'not_zip'
      | 'unzip_failed'
      | 'no_metadata'
      | 'invalid_json'
      | 'invalid_schema'
      | 'unsupported_version',
  ) {
    super(message);
    this.name = 'BackupZipParseError';
  }
}

function normalizeZipPath(key: string): string {
  return key.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

async function readZipHeader(file: File): Promise<Uint8Array> {
  const slice = file.slice(0, 4);
  const buf = await slice.arrayBuffer();
  return new Uint8Array(buf);
}

function looksLikeZip(head: Uint8Array): boolean {
  if (head.byteLength < 4) return false;
  return head[0] === 0x50 && head[1] === 0x4b;
}

function zipRootPrefixFromMetadataPath(metaPath: string): string {
  const n = normalizeZipPath(metaPath);
  if (n === 'metadata.json') return '';
  const slash = n.lastIndexOf('/');
  if (slash < 0) return '';
  return n.slice(0, slash + 1);
}

function normalizeDurationField(value: unknown): string {
  if (value === null || value === undefined) return '0:00';
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const totalSec = Math.max(0, Math.floor(value));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  return '0:00';
}

function stripEmbedding<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row };
  delete next.embedding;
  return next;
}

function parseTaskPriority(value: unknown): ParsedTask['priority'] {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return undefined;
}

function parseTaskSource(value: unknown): ParsedTask['source'] {
  if (value === 'manual' || value === 'ai') return value;
  return undefined;
}

function toParsedRecord(raw: Record<string, unknown>): ParsedRecord {
  const r = stripEmbedding(raw);
  const tasksRaw = Array.isArray(r.tasks) ? r.tasks : [];
  const tasks: ParsedTask[] = tasksRaw
    .filter((t): t is Record<string, unknown> => t != null && typeof t === 'object')
    .map((t) => ({
      id: String(t.id ?? ''),
      text: String(t.text ?? ''),
      isDone: Boolean(t.isDone),
      deadline: t.deadline != null ? String(t.deadline) : undefined,
      deadlineTime: t.deadlineTime != null ? String(t.deadlineTime) : undefined,
      priority: parseTaskPriority(t.priority),
      source: parseTaskSource(t.source),
    }))
    .filter((t) => t.id.length > 0);

  const keyPhrases = Array.isArray(r.keyPhrases)
    ? r.keyPhrases.filter((x): x is string => typeof x === 'string')
    : [];
  const nextSteps = Array.isArray(r.nextSteps)
    ? r.nextSteps.filter((x): x is string => typeof x === 'string')
    : [];
  const tags = Array.isArray(r.tags)
    ? r.tags.filter((x): x is string => typeof x === 'string')
    : [];

  return {
    id: String(r.id ?? ''),
    createdAt: String(r.createdAt ?? ''),
    title: r.title != null ? String(r.title) : '',
    transcript: r.transcript != null ? String(r.transcript) : '',
    translatedTranscript:
      r.translatedTranscript != null ? String(r.translatedTranscript) : undefined,
    translationLanguage: r.translationLanguage != null ? String(r.translationLanguage) : undefined,
    summary: r.summary != null ? String(r.summary) : undefined,
    classification: r.classification != null ? String(r.classification) : undefined,
    keyPhrases,
    nextSteps,
    folderId: r.folderId != null && r.folderId !== '' ? String(r.folderId) : null,
    audioPath:
      r.audioPath != null && String(r.audioPath).trim() !== '' ? String(r.audioPath) : undefined,
    duration: normalizeDurationField(r.duration),
    tags,
    tasks,
    isPinned: typeof r.isPinned === 'boolean' ? r.isPinned : undefined,
    status: r.status != null ? String(r.status) : undefined,
  };
}

function toParsedFolder(raw: Record<string, unknown>): ParsedFolder {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    color: raw.color != null ? String(raw.color) : undefined,
    icon: raw.icon != null ? String(raw.icon) : undefined,
    sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : undefined,
    createdAt: raw.createdAt != null ? String(raw.createdAt) : undefined,
  };
}

/**
 * Reads a Voice Inbox mobile backup `.zip` in the browser without loading
 * all uncompressed files at once (metadata only up front; audio on demand).
 */
export async function parseBackupZip(file: File): Promise<ParsedBackup> {
  if (file.size > MAX_BACKUP_ZIP_BYTES) {
    throw new BackupZipParseError('Backup file is too large for the browser viewer.', 'too_large');
  }

  const head = await readZipHeader(file);
  if (!looksLikeZip(head)) {
    throw new BackupZipParseError('This file does not look like a ZIP archive.', 'not_zip');
  }

  const zipReader = new ZipReader<Blob>(new BlobReader(file));
  let entries: Awaited<ReturnType<ZipReader<Blob>['getEntries']>>;
  try {
    entries = await zipReader.getEntries();
  } catch {
    await zipReader.close().catch(() => {});
    throw new BackupZipParseError('Could not read the ZIP archive.', 'unzip_failed');
  }

  const entryByNorm = new Map<string, (typeof entries)[number]>();
  let metaEntry: (typeof entries)[number] | undefined;
  let metaNorm = '';

  for (const entry of entries) {
    if (entry.directory) continue;
    const n = normalizeZipPath(entry.filename);
    entryByNorm.set(n, entry);
    if (n === 'metadata.json' || n.endsWith('/metadata.json')) {
      if (!metaEntry) {
        metaEntry = entry;
        metaNorm = n;
      }
    }
  }

  if (!metaEntry) {
    await zipReader.close().catch(() => {});
    throw new BackupZipParseError('No metadata.json found inside the archive.', 'no_metadata');
  }

  if (metaEntry.directory) {
    await zipReader.close().catch(() => {});
    throw new BackupZipParseError('No metadata.json found inside the archive.', 'no_metadata');
  }

  let jsonText: string;
  try {
    jsonText = await metaEntry.getData(new TextWriter());
  } catch {
    await zipReader.close().catch(() => {});
    throw new BackupZipParseError('Could not read metadata.json from the archive.', 'unzip_failed');
  }

  if (!jsonText?.trim()) {
    await zipReader.close().catch(() => {});
    throw new BackupZipParseError('metadata.json is empty.', 'no_metadata');
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonText);
  } catch {
    await zipReader.close().catch(() => {});
    throw new BackupZipParseError('metadata.json is not valid JSON.', 'invalid_json');
  }

  const version = (parsedJson as { version?: unknown })?.version;
  if (version !== 3) {
    await zipReader.close().catch(() => {});
    throw new BackupZipParseError(
      version === 1 || version === 2
        ? 'This export version is not supported in the web viewer yet. Re-export from the app (backup v3).'
        : 'Unrecognized backup format.',
      'unsupported_version',
    );
  }

  const payloadResult = ExportPayloadV3EnvelopeSchema.safeParse(parsedJson);
  if (!payloadResult.success) {
    await zipReader.close().catch(() => {});
    throw new BackupZipParseError('Backup metadata failed validation.', 'invalid_schema');
  }

  const payload = payloadResult.data;
  const zipRootPrefix = zipRootPrefixFromMetadataPath(metaNorm);

  let droppedFolderCount = 0;
  const folders: ParsedFolder[] = [];
  for (const f of payload.folders ?? []) {
    if (f == null || typeof f !== 'object') {
      droppedFolderCount++;
      continue;
    }
    const row = f as Record<string, unknown>;
    const parsed = toParsedFolder(row);
    if (parsed.id.length > 0) {
      folders.push(parsed);
    } else {
      droppedFolderCount++;
    }
  }

  let droppedRecordCount = 0;
  const records: ParsedRecord[] = [];
  for (const raw of payload.records) {
    if (raw == null || typeof raw !== 'object') {
      droppedRecordCount++;
      continue;
    }
    const obj = stripEmbedding(raw as Record<string, unknown>);
    const validated = VoiceRecordSchema.safeParse(obj);
    if (validated.success) {
      const rec = toParsedRecord(validated.data as Record<string, unknown>);
      if (rec.id.length > 0) records.push(rec);
      else droppedRecordCount++;
      continue;
    }
    const id = obj.id != null ? String(obj.id).trim() : '';
    if (!id) {
      droppedRecordCount++;
      continue;
    }
    const tr = obj.transcript;
    if (typeof tr === 'string' && tr.length > EXPORT_MAX_RECORD_TEXT_CHARS) {
      droppedRecordCount++;
      continue;
    }
    const sm = obj.summary;
    if (typeof sm === 'string' && sm.length > EXPORT_MAX_RECORD_TEXT_CHARS) {
      droppedRecordCount++;
      continue;
    }
    const tt = obj.translatedTranscript;
    if (typeof tt === 'string' && tt.length > EXPORT_MAX_RECORD_TEXT_CHARS) {
      droppedRecordCount++;
      continue;
    }
    records.push(toParsedRecord(obj));
  }

  const parseWarnings =
    droppedFolderCount > 0 || droppedRecordCount > 0
      ? { droppedFolderCount, droppedRecordCount }
      : undefined;

  let closed = false;
  const dispose = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    await zipReader.close().catch(() => {});
  };

  const readFile = async (normalizedPathInZip: string): Promise<Uint8Array | null> => {
    if (closed) return null;
    const entry = entryByNorm.get(normalizedPathInZip);
    if (!entry || entry.directory) return null;
    try {
      return await entry.getData(new Uint8ArrayWriter());
    } catch {
      return null;
    }
  };

  return {
    backupFormatVersion: 3,
    exportedAt: payload.exportedAt,
    folders,
    records,
    parseWarnings,
    zipRootPrefix,
    readFile,
    dispose,
  };
}

/** Resolve audio bytes for a record's `audioPath` inside the zip (reads that file only). */
export async function getAudioBytesFromBackup(
  backup: ParsedBackup,
  audioRelativePath: string,
): Promise<Uint8Array | null> {
  const rel = audioRelativePath.replace(/^\//, '').replace(/\\/g, '/');
  const candidates = [normalizeZipPath(`${backup.zipRootPrefix}${rel}`), normalizeZipPath(rel)];
  for (const c of candidates) {
    const hit = await backup.readFile(c);
    if (hit?.length) return hit;
  }
  return null;
}
