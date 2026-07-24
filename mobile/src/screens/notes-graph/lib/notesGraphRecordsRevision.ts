import type { TaskItem, VoiceRecord } from '@/entities/record';

function hashString(input: string): string {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function serializeTaskRevision(task: TaskItem): string {
  return [
    task.id,
    task.isDone ? 1 : 0,
    task.text,
    task.deadline ?? '',
    task.deadlineTime ?? '',
    task.priority ?? '',
  ].join('\u001d');
}

function serializeRecordGraphRevision(record: VoiceRecord): string {
  const tags = (record.tags ?? []).slice().sort().join(',');
  const links = (record.linkedRecordIds ?? []).slice().sort().join(',');
  const tasks = (record.tasks ?? []).map(serializeTaskRevision).sort().join('\u001c');
  const keyPhrases = (record.keyPhrases ?? []).slice().sort().join(',');
  const embeddingLength = record.embedding?.length ?? 0;

  return [
    record.id,
    record.title,
    record.status,
    record.folderId ?? '',
    tags,
    links,
    tasks,
    record.summary ?? '',
    record.transcript?.length ?? 0,
    keyPhrases,
    embeddingLength,
  ].join('\u001f');
}

/** Stable revision for graph topology, search index, and layout cache invalidation. */
export function buildNotesGraphRecordsRevision(records: VoiceRecord[]): string {
  if (records.length === 0) return '0';

  const fingerprints = records.map(serializeRecordGraphRevision).sort().join('\u001e');

  return `${records.length}:${hashString(fingerprints)}`;
}
