import {
  ExportPayloadV3EnvelopeSchema,
  ExportPayloadV3Schema,
  ExportPayloadV4EnvelopeSchema,
  ExportPayloadV4Schema,
} from './schema';

const validRecord = {
  id: 'rec-1',
  createdAt: '2026-06-01T00:00:00.000Z',
  title: 'Meeting',
  tasks: [{ id: 't1', text: 'Follow up', isDone: false }],
};

const validRecordV4 = {
  ...validRecord,
  transcriptSegments: [
    { id: 'seg-1', startTime: '0:05', startMs: 5000, text: 'Hello world', speakerId: 'S1' },
  ],
  linkedRecordIds: ['rec-2'],
  language: 'en',
  meetingSummaryTemplate: 'standup',
};

describe('backup-export schema v3', () => {
  it('ExportPayloadV3Schema accepts valid v3 backup payload', () => {
    const parsed = ExportPayloadV3Schema.safeParse({
      version: 3,
      exportedAt: '2026-06-09T12:00:00.000Z',
      folders: [{ id: 'f1', name: 'Work' }],
      records: [validRecord],
    });

    expect(parsed.success).toBe(true);
  });

  it('ExportPayloadV3Schema rejects wrong version', () => {
    const parsed = ExportPayloadV3Schema.safeParse({
      version: 2,
      exportedAt: '2026-06-09T12:00:00.000Z',
      records: [validRecord],
    });

    expect(parsed.success).toBe(false);
  });

  it('ExportPayloadV3EnvelopeSchema allows unknown record rows for per-row validation', () => {
    const parsed = ExportPayloadV3EnvelopeSchema.safeParse({
      version: 3,
      exportedAt: '2026-06-09T12:00:00.000Z',
      records: [{ id: 'rec-1' }, { bad: true }],
    });

    expect(parsed.success).toBe(true);
  });
});

describe('backup-export schema v4', () => {
  it('ExportPayloadV4Schema accepts valid v4 payload with graphLayouts', () => {
    const parsed = ExportPayloadV4Schema.safeParse({
      version: 4,
      exportedAt: '2026-06-09T12:00:00.000Z',
      folders: [{ id: 'f1', name: 'Work' }],
      records: [validRecordV4],
      graphLayouts: [
        {
          id: 'gl-1',
          layoutKey: 'default',
          versionNumber: 1,
          createdAt: '2026-06-01T00:00:00.000Z',
          payload: '{"v":1,"positions":{}}',
          name: 'My layout',
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it('ExportPayloadV4Schema accepts v4 payload without graphLayouts', () => {
    const parsed = ExportPayloadV4Schema.safeParse({
      version: 4,
      exportedAt: '2026-06-09T12:00:00.000Z',
      records: [validRecord],
    });

    expect(parsed.success).toBe(true);
  });

  it('ExportPayloadV4Schema rejects wrong version', () => {
    const parsed = ExportPayloadV4Schema.safeParse({
      version: 3,
      exportedAt: '2026-06-09T12:00:00.000Z',
      records: [validRecord],
    });

    expect(parsed.success).toBe(false);
  });

  it('ExportPayloadV4EnvelopeSchema allows unknown record and graphLayout rows', () => {
    const parsed = ExportPayloadV4EnvelopeSchema.safeParse({
      version: 4,
      exportedAt: '2026-06-09T12:00:00.000Z',
      records: [{ id: 'rec-1' }, { bad: true }],
      graphLayouts: [{ id: 'gl-1' }, { unknown: true }],
    });

    expect(parsed.success).toBe(true);
  });
});
