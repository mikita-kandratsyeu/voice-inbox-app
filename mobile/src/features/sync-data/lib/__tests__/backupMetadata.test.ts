jest.mock('@/shared/lib/folderColor', () => ({
  DEFAULT_FOLDER_BRAND_HEX: '#3b82f6',
}));

import {
  buildLegacyBackupFolders,
  normalizeBackupFolders,
  normalizeImportedVoiceRecord,
  parseBackupMetadataPayload,
} from '../backupMetadata';
import { normalizeImportedTasks } from '../normalizeImportedTasks';

describe('backup metadata import', () => {
  it('parses v3 payload with tasks, marks, and transcript segments', () => {
    const payload = {
      version: 3,
      exportedAt: '2026-06-09T12:00:00.000Z',
      folders: [{ id: 'f1', name: 'Work', color: '#111111', icon: 'briefcase', sortOrder: 0 }],
      records: [
        {
          id: 'rec-1',
          createdAt: '2026-06-01T10:00:00.000Z',
          title: 'Meeting',
          status: 'archived',
          readAt: '2026-06-02T10:00:00.000Z',
          tasks: [
            {
              id: 'task-1',
              text: 'Follow up',
              isDone: false,
              deadline: '2026-06-15',
              deadlineTime: '09:30',
              priority: 'high',
              source: 'manual',
            },
          ],
          recordingMarks: [
            { id: 'mark-1', offsetMs: 1200, kind: 'decision', label: 'Budget approved' },
          ],
          transcriptSegments: [{ id: 'seg-1', startTime: '0:01', text: 'Hello team' }],
          meetingSummaryTemplate: 'standup',
          tags: ['client'],
        },
      ],
    };

    const parsed = parseBackupMetadataPayload(payload);
    expect(parsed).not.toBeNull();
    expect(parsed?.version).toBe(3);

    const record = normalizeImportedVoiceRecord(parsed!.records[0]!);
    expect(record.status).toBe('archived');
    expect(record.tasks?.[0]).toMatchObject({
      deadline: '2026-06-15',
      deadlineTime: '09:30',
      priority: 'high',
      source: 'manual',
    });
    expect(record.recordingMarks?.[0]).toMatchObject({
      kind: 'decision',
      label: 'Budget approved',
    });
    expect(record.transcriptSegments?.[0]?.text).toBe('Hello team');
    expect(record.meetingSummaryTemplate).toBe('standup');
    expect(record.tags).toEqual(['client']);
  });

  it('normalizes legacy isRead into status', () => {
    const record = normalizeImportedVoiceRecord({
      id: 'rec-legacy',
      createdAt: '2026-01-01T00:00:00.000Z',
      isRead: true,
    });

    expect(record.status).toBe('read');
  });

  it('parses v1 and v2 payloads', () => {
    const v1 = parseBackupMetadataPayload({
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      records: [{ id: 'r1', createdAt: '2026-01-01T00:00:00.000Z' }],
    });
    const v2 = parseBackupMetadataPayload({
      version: 2,
      exportedAt: '2026-01-01T00:00:00.000Z',
      records: [{ id: 'r1', createdAt: '2026-01-01T00:00:00.000Z' }],
    });

    expect(v1?.version).toBe(1);
    expect(v2?.version).toBe(2);
  });

  it('rejects malformed payloads', () => {
    expect(parseBackupMetadataPayload(null)).toBeNull();
    expect(parseBackupMetadataPayload({ version: 99, exportedAt: 'x', records: [] })).toBeNull();
    expect(
      parseBackupMetadataPayload({
        version: 3,
        exportedAt: '2026-01-01T00:00:00.000Z',
        records: [{ id: 'r1' }],
      }),
    ).toBeNull();
  });
});

describe('normalizeBackupFolders', () => {
  it('maps folders with defaults for missing fields', () => {
    const folders = normalizeBackupFolders([
      { id: 'f1', name: 'Work', color: '#111111', icon: 'briefcase', sortOrder: 2 },
      { id: 'f2', name: 'Personal' },
    ]);

    expect(folders).toHaveLength(2);
    expect(folders[0]).toMatchObject({ id: 'f1', name: 'Work', sortOrder: 2 });
    expect(folders[1]?.color).toBe('#3b82f6');
    expect(folders[1]?.icon).toBe('briefcase');
  });

  it('returns empty array for invalid input', () => {
    expect(normalizeBackupFolders(undefined)).toEqual([]);
  });
});

describe('buildLegacyBackupFolders', () => {
  it('creates placeholder folders from unique record folderIds', () => {
    const folders = buildLegacyBackupFolders([
      { id: 'r1', createdAt: '2026-01-01T00:00:00.000Z', folderId: 'legacy-a' },
      { id: 'r2', createdAt: '2026-01-01T00:00:00.000Z', folderId: 'legacy-a' },
      { id: 'r3', createdAt: '2026-01-01T00:00:00.000Z', folderId: 'legacy-b' },
    ]);

    expect(folders).toHaveLength(2);
    expect(folders.map((f) => f.id).sort()).toEqual(['legacy-a', 'legacy-b']);
    expect(folders[0]?.name).toMatch(/^Imported folder /);
  });
});

describe('normalizeImportedTasks', () => {
  it('keeps deadline fields and priority', () => {
    const tasks = normalizeImportedTasks([
      {
        id: 't1',
        text: ' Ship fix ',
        isDone: false,
        deadline: '2026-07-01',
        deadlineTime: '18:00',
        priority: 'medium',
        source: 'ai',
      },
    ]);

    expect(tasks).toEqual([
      {
        id: 't1',
        text: 'Ship fix',
        isDone: false,
        deadline: '2026-07-01',
        deadlineTime: '18:00',
        priority: 'medium',
        source: 'ai',
      },
    ]);
  });
});
