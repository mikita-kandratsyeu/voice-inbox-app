import { DEFAULT_LOCAL_AI_MODEL_ID } from '@/entities/settings/model/constants';

import { runLocalMeetingDialogue } from '../local-provider/localAiMeetingDialogue';
import { runLocalSummaryTasks } from '../localProvider';
import { AIOrchestrator } from '../orchestrator';
import type { AiExecutionContext } from '../types';

jest.mock('../localProvider', () => ({
  runLocalSummaryTasks: jest.fn(),
  runLocalAsk: jest.fn(),
}));

jest.mock('../local-provider/localAiMeetingDialogue', () => ({
  runLocalMeetingDialogue: jest.fn(),
}));

jest.mock('../cloudProvider', () => ({
  runCloudSummaryTasks: jest.fn(),
  runCloudAsk: jest.fn(),
}));

jest.mock('@/shared/lib', () => ({
  i18n: { t: (key: string) => key },
}));

jest.mock('@/shared/lib/fetch', () => ({
  nitroFetch: jest.fn(),
}));

const mockedSummary = jest.mocked(runLocalSummaryTasks);
const mockedMeeting = jest.mocked(runLocalMeetingDialogue);

function createCtx(overrides: Partial<AiExecutionContext> = {}): AiExecutionContext {
  return {
    selectedAIModel: 'google/gemini-2.5-flash-lite',
    selectedLocalAiModel: DEFAULT_LOCAL_AI_MODEL_ID,
    isLocalLlmModelDownloaded: true,
    summaryStyle: 'standard',
    taskStrictness: 'balanced',
    aiOutputLanguage: 'same',
    aiExecutionMode: 'private_experimental',
    privateLocalLlmBudget: 'balanced',
    privateRemoteOutputBudget: 'balanced',
    privateRemotePreferJsonObject: true,
    privateCapabilityTier: 'full',
    privateAiProvider: 'local',
    privateRemoteBaseUrl: '',
    privateRemoteApiKey: '',
    privateRemoteModel: '',
    cloudMessageTtlSeconds: 3600,
    aiModelRoutingMode: 'manual',
    ...overrides,
  };
}

describe('AIOrchestrator.runSummaryTasks (private)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks private mode when capability tier is unavailable', async () => {
    const result = await AIOrchestrator.runSummaryTasks(
      { id: 'r1-ai', transcript: 'hello' },
      createCtx({ privateCapabilityTier: 'unavailable' }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('ai.privateModeUnavailable');
    expect(mockedSummary).not.toHaveBeenCalled();
  });

  it('runs two local passes when expectAsyncMeetingDialogue is set', async () => {
    mockedSummary.mockResolvedValue({
      ok: true,
      provider: 'local',
      mode: 'private_experimental',
      result: {
        summary: 'Recap',
        suggestedTitle: 'Meet',
        tasks: [],
        tags: [],
        keyPhrases: [],
      },
    });
    mockedMeeting.mockResolvedValue({
      ok: true,
      meetingDialogueMarkdown: 'Speaker 1: hi',
    });

    const onCloudSummaryReady = jest.fn();
    const result = await AIOrchestrator.runSummaryTasks(
      {
        id: 'r1-ai',
        transcript: 'long transcript',
        expectAsyncMeetingDialogue: true,
        onCloudSummaryReady,
      },
      createCtx(),
    );

    expect(mockedSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        omitMeetingDialogue: true,
        processingPreset: 'meeting',
        expectAsyncMeetingDialogue: false,
      }),
      expect.any(Object),
    );
    expect(onCloudSummaryReady).toHaveBeenCalledTimes(1);
    expect(mockedMeeting).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.meetingDialogueMarkdown).toBe('Speaker 1: hi');
    expect(result.meetingDialogueStatus).toBe('done');
  });
});
