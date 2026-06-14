import type { VoiceRecord } from '@/entities/record';

import { buildFollowUpNoteDraft } from '../buildFollowUpNoteDraft';

describe('buildFollowUpNoteDraft', () => {
  const source: VoiceRecord = {
    id: 'rec_source',
    title: 'Weekly sync',
    transcript: '',
    summary: '',
    tasks: [],
    duration: '0:00',
    durationMs: 0,
    createdAt: '',
    status: 'unread',
    aiStatus: 'idle',
    transcriptProgress: 0,
    isPinned: false,
    tags: ['project-x'],
    folderId: 'folder-1',
  };

  it('builds title and seed transcript from task text', () => {
    const draft = buildFollowUpNoteDraft(
      source,
      { id: 't1', text: 'Send proposal', isDone: false },
      { titlePrefix: 'Outcome', seedHeading: 'Task' },
    );

    expect(draft.suggestedTitle).toBe('Outcome: Send proposal');
    expect(draft.seedTranscript).toContain('Task');
    expect(draft.seedTranscript).toContain('Send proposal');
    expect(draft.tags).toEqual(['project-x']);
    expect(draft.folderId).toBe('folder-1');
  });
});
