import { DEFAULT_LOCAL_AI_MODEL_ID } from '@/entities/settings/model/constants';

import { runPrivateRemoteMeetingDialogue } from '../privateRemoteProvider';
import type { AiExecutionContext } from '../types';

jest.mock('../local-provider/localAiMeetingDialogue', () => ({
  buildMeetingDialogueSystemPrompt: () => 'system prompt',
  buildMeetingDialogueUserContent: () => 'user content',
}));

jest.mock('@/shared/lib', () => ({
  i18n: {
    t: (key: string) => key,
  },
}));

const mockNitroFetch = jest.fn();

jest.mock('@/shared/lib/fetch', () => ({
  nitroFetch: (...args: unknown[]) => mockNitroFetch(...args),
}));

type MockChatPayload = {
  content: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
};

function mockChatCompletion(payload: MockChatPayload): Response {
  return {
    ok: true,
    json: async () => ({
      model: payload.model ?? 'test/model',
      usage: {
        prompt_tokens: payload.promptTokens ?? 100,
        completion_tokens: payload.completionTokens ?? 50,
      },
      choices: [
        {
          message: {
            content: payload.content,
          },
        },
      ],
    }),
  } as Response;
}

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
    privateCapabilityTier: 'full',
    privateAiProvider: 'custom_openai',
    privateRemoteBaseUrl: 'http://127.0.0.1:1234',
    privateRemoteApiKey: '',
    privateRemoteModel: 'google/gemma-4-26b-a4b',
    cloudMessageTtlSeconds: 3600,
    aiModelRoutingMode: 'manual',
    ...overrides,
  };
}

describe('runPrivateRemoteMeetingDialogue', () => {
  afterEach(() => {
    mockNitroFetch.mockReset();
  });

  it('extracts meeting dialogue from loose malformed payload', async () => {
    mockNitroFetch.mockResolvedValue(
      mockChatCompletion({
        content:
          'not-json prefix... "meetingDialogueMarkdown":"Speaker 1: Привет\\nSpeaker 1: Обновление статуса" suffix',
      }),
    );

    const result = await runPrivateRemoteMeetingDialogue(
      {
        transcript: 'тестовый транскрипт',
        phase1: {
          suggestedTitle: 'Встреча',
          summary: 'Обсуждение задач',
          keyPhrases: ['задачи'],
        },
      },
      createCtx(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.meetingDialogueMarkdown).toContain('Speaker 1: Привет');
    expect(mockNitroFetch).toHaveBeenCalledTimes(1);
  });

  it('uses repair pass when first and retry responses are unparseable', async () => {
    mockNitroFetch
      .mockResolvedValueOnce(
        mockChatCompletion({
          content: 'bad json one without usable key',
          completionTokens: 2500,
        }),
      )
      .mockResolvedValueOnce(
        mockChatCompletion({
          content: 'bad json two still unusable',
          completionTokens: 2400,
        }),
      )
      .mockResolvedValueOnce(
        mockChatCompletion({
          content: '{"meetingDialogueMarkdown":"Speaker 1: Финальный рабочий вариант"}',
          completionTokens: 120,
        }),
      );

    const result = await runPrivateRemoteMeetingDialogue(
      {
        transcript: 'длинный транскрипт',
        phase1: {
          suggestedTitle: 'Созвон',
          summary: 'Сводка',
          keyPhrases: ['созвон'],
        },
      },
      createCtx(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.meetingDialogueMarkdown).toBe('Speaker 1: Финальный рабочий вариант');
    expect(mockNitroFetch).toHaveBeenCalledTimes(3);
  });
});
