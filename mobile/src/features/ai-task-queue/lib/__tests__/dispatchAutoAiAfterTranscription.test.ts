jest.mock('@/entities/settings', () => ({
  isPrivateCustomServerMode: (mode: string, provider: string, isPro: boolean) =>
    mode === 'private_experimental' && provider === 'custom_openai' && isPro,
}));

jest.mock('@/features/app-storefront', () => ({
  shouldApplyAutoAiAfterTranscription: jest.fn(
    (toggle: boolean, isPro: boolean, mode?: string, provider?: string) => {
      if (mode === 'private_experimental' && provider === 'custom_openai') {
        return toggle && isPro;
      }
      if (mode === 'smart_hybrid') {
        return toggle && isPro;
      }
      return false;
    },
  ),
  shouldApplyPrivateServerAutoAi: jest.fn((toggle: boolean, isPro: boolean) => toggle && isPro),
}));

import type { VoiceRecord } from '@/entities/record';

import { dispatchAutoAiAfterTranscription } from '../dispatchAutoAiAfterTranscription';
import { scheduleDrainPrivateAiTaskQueue } from '../privateAiTaskDrainCoordinator';
import { processRecordViaPrivateAiBridge } from '../privateAiTaskProcessBridge';
import { enqueuePrivateAiTask } from '../privateAiTaskQueueDb';
import { isPrivateRemoteServerReachable } from '../privateRemoteReachability';

jest.mock('../privateAiTaskQueueDb', () => ({
  enqueuePrivateAiTask: jest.fn(),
}));

jest.mock('../privateAiTaskProcessBridge', () => ({
  processRecordViaPrivateAiBridge: jest.fn(),
}));

jest.mock('../privateRemoteReachability', () => ({
  isPrivateRemoteServerReachable: jest.fn(),
}));

jest.mock('../privateAiTaskDrainCoordinator', () => ({
  scheduleDrainPrivateAiTaskQueue: jest.fn(),
}));

jest.mock('@/entities/record', () => ({
  useRecordStore: {
    getState: () => ({
      setSummaryStatus: jest.fn(),
    }),
  },
}));

const baseRecord: VoiceRecord = {
  id: 'rec_test',
  title: 'Test',
  transcript: 'hello',
  transcriptSegments: [],
  summary: '',
  tasks: [],
  duration: '0:01',
  createdAt: '2026-01-01T00:00:00.000Z',
  status: 'unread',
  isPinned: false,
  tags: [],
};

describe('dispatchAutoAiAfterTranscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('processes immediately when private server is reachable', async () => {
    (isPrivateRemoteServerReachable as jest.Mock).mockResolvedValue(true);
    (processRecordViaPrivateAiBridge as jest.Mock).mockResolvedValue(true);

    await dispatchAutoAiAfterTranscription({
      record: baseRecord,
      autoAiAfterTranscription: true,
      isProActive: true,
      isConnected: false,
      aiExecutionMode: 'private_experimental',
      privateAiProvider: 'custom_openai',
    });

    expect(processRecordViaPrivateAiBridge).toHaveBeenCalledWith(baseRecord);
    expect(enqueuePrivateAiTask).not.toHaveBeenCalled();
  });

  it('enqueues when private server is unreachable', async () => {
    (isPrivateRemoteServerReachable as jest.Mock).mockResolvedValue(false);
    (processRecordViaPrivateAiBridge as jest.Mock).mockResolvedValue(false);

    await dispatchAutoAiAfterTranscription({
      record: baseRecord,
      autoAiAfterTranscription: true,
      isProActive: true,
      isConnected: false,
      aiExecutionMode: 'private_experimental',
      privateAiProvider: 'custom_openai',
    });

    expect(enqueuePrivateAiTask).toHaveBeenCalledWith({
      recordId: 'rec_test',
      taskType: 'summarize',
      source: 'auto_after_transcription',
    });
    expect(scheduleDrainPrivateAiTaskQueue).toHaveBeenCalled();
  });

  it('skips smart auto-ai when offline', async () => {
    await dispatchAutoAiAfterTranscription({
      record: baseRecord,
      autoAiAfterTranscription: true,
      isProActive: true,
      isConnected: false,
      aiExecutionMode: 'smart_hybrid',
      privateAiProvider: 'local',
    });

    expect(processRecordViaPrivateAiBridge).not.toHaveBeenCalled();
    expect(enqueuePrivateAiTask).not.toHaveBeenCalled();
  });
});
