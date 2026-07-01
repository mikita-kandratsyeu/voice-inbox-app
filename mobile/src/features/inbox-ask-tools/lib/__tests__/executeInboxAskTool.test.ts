import type { VoiceRecord } from '@/entities/record/model/types';
import { executeInboxAskTool } from '@/features/inbox-ask-tools/lib/executeInboxAskTool';
import type { InboxAskToolCall } from '@/shared/lib/ai-core/types';

jest.mock('@/entities/record/model/repository', () => ({
  recordRepository: {
    getEmbeddingsForActiveRecords: jest.fn(async () => new Map()),
  },
}));

jest.mock('@/features/inbox-ask-retrieval', () => ({
  filterInboxAskCorpusRecords: (
    records: Array<{ folderId?: string | null; status?: string }>,
    scope?: { folderId?: string | null; includeArchived?: boolean },
  ) =>
    records.filter((record) => {
      if (!scope?.includeArchived && record.status === 'archived') return false;
      if (scope?.folderId && (record.folderId ?? null) !== scope.folderId) return false;
      return true;
    }),
  prepareInboxAskQueryEmbedding: jest.fn(async () => undefined),
  retrieveNotesForInboxAsk: jest.fn(() => ({
    notes: [],
    totalCorpusCount: 0,
    droppedCount: 0,
    retrievalMode: 'lexical',
  })),
}));

jest.mock('@/features/related-notes/lib/computeRecordSimilarity', () => ({
  buildSimilarityContext: jest.fn(() => ({ useEmbeddings: false, centroid: null })),
  rankSimilarRecords: jest.fn(() => []),
}));

const baseRecord: VoiceRecord = {
  id: 'record-1',
  title: 'Launch plan',
  transcript: 'A'.repeat(2_000),
  summary: 'Discussed product launch, beta users, and investor update.',
  tasks: [
    { id: 'task-1', text: 'Email beta users with launch date', isDone: false, priority: 'high' },
    { id: 'task-2', text: 'Archive old launch notes', isDone: true },
  ],
  duration: '1:00',
  durationMs: 60_000,
  createdAt: '2026-06-01T10:00:00.000Z',
  status: 'unread',
  tags: ['product', 'launch'],
  keyPhrases: ['beta users', 'investor update'],
  audioPath: '/private/audio/file.m4a',
  embedding: [0.1, 0.2],
};

function call(
  toolName: InboxAskToolCall['toolName'],
  args: Record<string, unknown>,
): InboxAskToolCall {
  return {
    toolCallId: `call-${toolName}`,
    toolName,
    arguments: args,
    round: 1,
  };
}

const folderRecord: VoiceRecord = {
  ...baseRecord,
  id: 'record-folder',
  folderId: 'folder-a',
};

const outOfScopeRecord: VoiceRecord = {
  ...baseRecord,
  id: 'record-other',
  folderId: 'folder-b',
  title: 'Other folder note',
  tasks: [{ id: 'task-3', text: 'Follow up with design team', isDone: false }],
};

describe('executeInboxAskTool', () => {
  it('returns bounded note details without audio paths or embeddings', async () => {
    const result = await executeInboxAskTool(call('get_note', { recordId: 'record-1' }), {
      records: [baseRecord],
    });

    expect(result.result.toolName).toBe('get_note');
    const payload = JSON.stringify(result.result);
    expect(payload).toContain('Launch plan');
    expect(payload).not.toContain('audioPath');
    expect(payload).not.toContain('/private/audio');
    expect(payload).not.toContain('embedding');
    expect(payload).not.toContain('0.1');
  });

  it('caps transcript excerpts when explicitly requested', async () => {
    const result = await executeInboxAskTool(
      call('get_note', { recordId: 'record-1', includeTranscriptExcerpt: true }),
      { records: [baseRecord] },
    );

    if (result.result.toolName !== 'get_note') throw new Error('unexpected tool result');
    expect(result.result.note?.transcriptExcerpt?.length).toBeLessThanOrEqual(903);
  });

  it('lists bounded task rows', async () => {
    const result = await executeInboxAskTool(call('list_tasks', { filter: 'open' }), {
      records: [baseRecord],
    });

    if (result.result.toolName !== 'list_tasks') throw new Error('unexpected tool result');
    expect(result.result.tasks).toEqual([
      expect.objectContaining({
        recordId: 'record-1',
        text: 'Email beta users with launch date',
        isDone: false,
      }),
    ]);
  });

  it('scopes get_note to the active corpus folder', async () => {
    const inScope = await executeInboxAskTool(call('get_note', { recordId: 'record-folder' }), {
      records: [folderRecord, outOfScopeRecord],
      scope: { folderId: 'folder-a' },
    });
    const outOfScope = await executeInboxAskTool(call('get_note', { recordId: 'record-other' }), {
      records: [folderRecord, outOfScopeRecord],
      scope: { folderId: 'folder-a' },
    });

    if (inScope.result.toolName !== 'get_note' || outOfScope.result.toolName !== 'get_note') {
      throw new Error('unexpected tool result');
    }
    expect(inScope.result.note?.title).toBe('Launch plan');
    expect(outOfScope.result.note).toBeNull();
  });

  it('scopes list_tasks to the active corpus folder', async () => {
    const result = await executeInboxAskTool(call('list_tasks', { filter: 'open' }), {
      records: [folderRecord, outOfScopeRecord],
      scope: { folderId: 'folder-a' },
    });

    if (result.result.toolName !== 'list_tasks') throw new Error('unexpected tool result');
    expect(result.result.tasks).toEqual([expect.objectContaining({ recordId: 'record-folder' })]);
    expect(result.result.tasks.some((task) => task.recordId === 'record-other')).toBe(false);
  });
});
