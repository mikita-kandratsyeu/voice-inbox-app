import { ExportPayloadV3EnvelopeSchema, ExportPayloadV3Schema } from './schema';

const validRecord = {
  id: 'rec-1',
  createdAt: '2026-06-01T00:00:00.000Z',
  title: 'Meeting',
  tasks: [{ id: 't1', text: 'Follow up', isDone: false }],
};

describe('backup-export schema', () => {
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
