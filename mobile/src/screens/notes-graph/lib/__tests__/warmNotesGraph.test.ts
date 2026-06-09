import type { VoiceRecord } from '@/entities/record';

import { DEFAULT_GRAPH_LAYOUT_MODE } from '../graphTypes';
import { warmNotesGraphLayoutWithFilters } from '../notesGraphLayoutCache';
import { prefetchNotesGraphScreenBody } from '../prefetchNotesGraphScreenBody';
import { beginNotesGraphScreenWarm } from '../warmNotesGraph';

jest.mock('../prefetchNotesGraphScreenBody', () => ({
  prefetchNotesGraphScreenBody: jest.fn(() => Promise.resolve({ NotesGraphScreenBody: jest.fn() })),
}));

jest.mock('../notesGraphLayoutCache', () => ({
  warmNotesGraphLayoutWithFilters: jest.fn(),
}));

const filters = {
  folderId: null,
  tags: [] as string[],
  showTasks: true,
  edgeVisibility: {
    similar: true,
    sharedTag: true,
    sameFolder: true,
    contains: true,
  },
  layoutMode: DEFAULT_GRAPH_LAYOUT_MODE,
};

function makeRecord(id: string): VoiceRecord {
  return {
    id,
    title: id,
    transcript: '',
    duration: '0:00',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'read',
  };
}

describe('beginNotesGraphScreenWarm', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('prefetches the screen body immediately', () => {
    beginNotesGraphScreenWarm([], filters, 390, 800);

    expect(prefetchNotesGraphScreenBody).toHaveBeenCalledTimes(1);
    expect(warmNotesGraphLayoutWithFilters).not.toHaveBeenCalled();
  });

  it('warms layout on the next tick when records exist', () => {
    const records = [makeRecord('a'), makeRecord('b')];

    beginNotesGraphScreenWarm(records, filters, 390, 800, true);

    jest.runOnlyPendingTimers();

    expect(warmNotesGraphLayoutWithFilters).toHaveBeenCalledWith(records, filters, true, 390, 800);
  });
});
