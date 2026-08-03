import { BlobReader, TextWriter, Uint8ArrayWriter, ZipReader } from '@zip.js/zip.js';

import { MAX_BACKUP_ZIP_BYTES } from './constants';
import {
  EXPORT_MAX_RECORD_TEXT_CHARS,
  ExportPayloadV3EnvelopeSchema,
  ExportPayloadV4EnvelopeSchema,
  VoiceRecordSchema,
} from './schema';
import type {
  MeetingSummaryTemplate,
  ParsedBackup,
  ParsedFolder,
  ParsedGraphLayout,
  ParsedRecord,
  ParsedTask,
  ParsedTranscriptSegment,
} from './types';

export type BackupZipParseErrorCode =
  | 'too_large'
  | 'not_zip'
  | 'unzip_failed'
  | 'no_metadata'
  | 'invalid_json'
  | 'invalid_schema'
  | 'unsupported_version'
  | 'password_required'
  | 'wrong_password';

export class BackupZipParseError extends Error {
  constructor(
    message: string,
    public readonly code: BackupZipParseErrorCode,
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

function parseRecordingMarksField(raw: unknown): ParsedRecord['recordingMarks'] {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: NonNullable<ParsedRecord['recordingMarks']> = [];
  for (const item of raw) {
    if (item === null || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id.trim() : '';
    const om = o.offsetMs;
    const offsetMs =
      typeof om === 'number' && Number.isFinite(om) ? Math.max(0, Math.round(om)) : null;
    if (!id || offsetMs === null) continue;
    const label = typeof o.label === 'string' ? o.label.slice(0, 300) : '';
    out.push({ id, offsetMs, label });
    if (out.length >= 500) break;
  }
  return out.length > 0 ? out : undefined;
}

function parseMeetingDialogueField(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  if (!t) return undefined;
  if (t.length > EXPORT_MAX_RECORD_TEXT_CHARS) {
    return t.slice(0, EXPORT_MAX_RECORD_TEXT_CHARS);
  }
  return t;
}

function parseDurationMsField(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  return Math.max(0, Math.round(raw));
}

function parseTranscriptSegmentsField(raw: unknown): ParsedTranscriptSegment[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: ParsedTranscriptSegment[] = [];
  for (const item of raw) {
    if (item === null || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id.trim() : '';
    if (!id) continue;
    const seg: ParsedTranscriptSegment = { id };
    if (typeof o.startTime === 'string') seg.startTime = o.startTime;
    if (typeof o.startMs === 'number' && Number.isFinite(o.startMs)) seg.startMs = o.startMs;
    if (typeof o.endMs === 'number' && Number.isFinite(o.endMs)) seg.endMs = o.endMs;
    if (typeof o.text === 'string') seg.text = o.text;
    if (typeof o.speakerId === 'string') seg.speakerId = o.speakerId;
    if (typeof o.language === 'string') seg.language = o.language;
    out.push(seg);
    if (out.length >= 50_000) break;
  }
  return out.length > 0 ? out : undefined;
}

function parseMeetingSpeakerLabels(raw: unknown): Record<string, string> | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k === 'string' && typeof v === 'string') {
      result[k] = v;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

const VALID_SUMMARY_TEMPLATES: MeetingSummaryTemplate[] = [
  'general',
  'standup',
  'sales_call',
  'one_on_one',
  'interview',
  'product_meeting',
  'lecture',
];

function parseMeetingSummaryTemplate(raw: unknown): MeetingSummaryTemplate | null {
  if (typeof raw === 'string' && VALID_SUMMARY_TEMPLATES.includes(raw as MeetingSummaryTemplate)) {
    return raw as MeetingSummaryTemplate;
  }
  return null;
}

function parseLinkedRecordIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out = raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  return out.length > 0 ? out : undefined;
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
    transcriptSegments: parseTranscriptSegmentsField(r.transcriptSegments),
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
    meetingDialogue: parseMeetingDialogueField(r.meetingDialogue),
    meetingSpeakerLabels: parseMeetingSpeakerLabels(r.meetingSpeakerLabels),
    meetingSummaryTemplate: parseMeetingSummaryTemplate(r.meetingSummaryTemplate),
    recordingMarks: parseRecordingMarksField(r.recordingMarks),
    durationMs: parseDurationMsField(r.durationMs),
    language: typeof r.language === 'string' ? r.language : undefined,
    linkedRecordIds: parseLinkedRecordIds(r.linkedRecordIds),
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

function toParsedGraphLayout(raw: Record<string, unknown>): ParsedGraphLayout | null {
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const layoutKey = typeof raw.layoutKey === 'string' ? raw.layoutKey.trim() : '';
  const versionNumber = typeof raw.versionNumber === 'number' ? raw.versionNumber : 0;
  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt.trim() : '';
  const payload = typeof raw.payload === 'string' ? raw.payload.trim() : '';
  if (!id || !layoutKey || !createdAt || !payload || versionNumber < 1) return null;
  return {
    id,
    layoutKey,
    versionNumber,
    createdAt,
    payload,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : undefined,
  };
}

export type BackupZipParseProgress =
  | 'verifying_password'
  | 'reading_archive'
  | 'checking_metadata'
  | 'done';

export type ParseBackupZipOptions = {
  password?: string;
  onProgress?: (stage: BackupZipParseProgress) => void;
};

/** Matches `voice-inbox-backup-locked-{timestamp}.zip` from mobile export. */
export function isBackupFilenamePasswordProtected(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.includes('backup-locked') || lower.includes('-locked-');
}

/** Probe ZIP entry flags without a password (fast path before full parse). */
export async function detectBackupZipEncryption(file: File): Promise<boolean> {
  if (file.size > MAX_BACKUP_ZIP_BYTES) return false;
  const head = await readZipHeader(file);
  if (!looksLikeZip(head)) return false;

  const zipReader = new ZipReader<Blob>(new BlobReader(file));
  try {
    const entries = await zipReader.getEntries();
    return entries.some((entry) => entry.encrypted === true);
  } catch {
    return false;
  } finally {
    await zipReader.close().catch(() => {});
  }
}

function isEncryptedZipError(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false;
  const code = 'code' in err ? String((err as { code?: unknown }).code) : '';
  const message = err instanceof Error ? err.message : String(err);
  return (
    code === 'Encrypted' ||
    code === 'Invalid password' ||
    /password/i.test(message) ||
    /encrypt/i.test(message)
  );
}

/**
 * Reads a Voice Inbox mobile backup `.zip` in the browser without loading
 * all uncompressed files at once (metadata only up front; audio on demand).
 * Supports backup format v3 and v4.
 */
export async function parseBackupZip(
  file: File,
  options?: ParseBackupZipOptions,
): Promise<ParsedBackup> {
  const report = (stage: BackupZipParseProgress) => options?.onProgress?.(stage);

  if (file.size > MAX_BACKUP_ZIP_BYTES) {
    throw new BackupZipParseError('Backup file is too large for the browser viewer.', 'too_large');
  }

  const head = await readZipHeader(file);
  if (!looksLikeZip(head)) {
    throw new BackupZipParseError('This file does not look like a ZIP archive.', 'not_zip');
  }

  const trimmedPassword = options?.password?.trim();
  if (trimmedPassword) {
    report('verifying_password');
  }

  const zipReader = new ZipReader<Blob>(
    new BlobReader(file),
    trimmedPassword ? { password: trimmedPassword } : undefined,
  );
  let entries: Awaited<ReturnType<ZipReader<Blob>['getEntries']>>;
  report('reading_archive');
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

  report('checking_metadata');

  let jsonText: string;
  try {
    jsonText = await metaEntry.getData(new TextWriter());
  } catch (err) {
    await zipReader.close().catch(() => {});
    if (!trimmedPassword && isEncryptedZipError(err)) {
      throw new BackupZipParseError('This backup is password-protected.', 'password_required');
    }
    if (trimmedPassword && isEncryptedZipError(err)) {
      throw new BackupZipParseError('Incorrect backup password.', 'wrong_password');
    }
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
  if (version !== 3 && version !== 4) {
    await zipReader.close().catch(() => {});
    throw new BackupZipParseError(
      version === 1 || version === 2
        ? 'This export version is not supported in the web viewer. Re-export from the app (backup v3 or v4).'
        : 'Unrecognized backup format.',
      'unsupported_version',
    );
  }

  const isV4 = version === 4;

  let rawRecords: unknown[];
  let rawFolders: unknown[] | undefined;
  let rawGraphLayouts: unknown[] | undefined;
  let exportedAt: string;

  if (isV4) {
    const payloadResult = ExportPayloadV4EnvelopeSchema.safeParse(parsedJson);
    if (!payloadResult.success) {
      await zipReader.close().catch(() => {});
      throw new BackupZipParseError('Backup metadata failed validation.', 'invalid_schema');
    }
    rawRecords = payloadResult.data.records;
    rawFolders = payloadResult.data.folders;
    rawGraphLayouts = payloadResult.data.graphLayouts;
    exportedAt = payloadResult.data.exportedAt;
  } else {
    const payloadResult = ExportPayloadV3EnvelopeSchema.safeParse(parsedJson);
    if (!payloadResult.success) {
      await zipReader.close().catch(() => {});
      throw new BackupZipParseError('Backup metadata failed validation.', 'invalid_schema');
    }
    rawRecords = payloadResult.data.records;
    rawFolders = payloadResult.data.folders;
    exportedAt = payloadResult.data.exportedAt;
  }

  const zipRootPrefix = zipRootPrefixFromMetadataPath(metaNorm);

  let droppedFolderCount = 0;
  const folders: ParsedFolder[] = [];
  for (const f of rawFolders ?? []) {
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
  for (const raw of rawRecords) {
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

  const graphLayouts: ParsedGraphLayout[] = [];
  for (const raw of rawGraphLayouts ?? []) {
    if (raw == null || typeof raw !== 'object') continue;
    const layout = toParsedGraphLayout(raw as Record<string, unknown>);
    if (layout) graphLayouts.push(layout);
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

  report('done');

  return {
    backupFormatVersion: isV4 ? 4 : 3,
    exportedAt,
    folders,
    records,
    graphLayouts: isV4 ? graphLayouts : undefined,
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
