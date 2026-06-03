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
    privateRemoteOutputBudget: 'balanced',
    privateRemotePreferJsonObject: true,
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

  it('sends response_format json_object when preferJsonObject is enabled', async () => {
    mockNitroFetch.mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { response_format?: { type: string } };
      expect(body.response_format).toEqual({ type: 'json_object' });
      return mockChatCompletion({
        content: '{"meetingDialogueMarkdown":"Speaker 1: Hi"}',
      });
    });

    const result = await runPrivateRemoteMeetingDialogue(
      {
        transcript: 'short transcript',
        phase1: { suggestedTitle: 'T', summary: 'S', keyPhrases: [] },
      },
      createCtx({ privateRemotePreferJsonObject: true }),
    );

    expect(result.ok).toBe(true);
    expect(mockNitroFetch).toHaveBeenCalledTimes(1);
  });

  it('retries without json_object when server rejects response_format', async () => {
    let call = 0;
    mockNitroFetch.mockImplementation(async (_url, init) => {
      call += 1;
      const body = JSON.parse(String(init?.body)) as { response_format?: { type: string } };
      if (call === 1) {
        expect(body.response_format).toEqual({ type: 'json_object' });
        return {
          ok: false,
          text: async () => 'response_format json_object is not supported',
        } as Response;
      }
      expect(body.response_format).toBeUndefined();
      return mockChatCompletion({
        content: '{"meetingDialogueMarkdown":"Speaker 1: Ok"}',
      });
    });

    const result = await runPrivateRemoteMeetingDialogue(
      {
        transcript: 'short transcript',
        phase1: { suggestedTitle: 'T', summary: 'S', keyPhrases: [] },
      },
      createCtx({ privateRemotePreferJsonObject: true }),
    );

    expect(result.ok).toBe(true);
    expect(mockNitroFetch).toHaveBeenCalledTimes(2);
  });

  it('retries without json_object when server only allows json_schema or text', async () => {
    let call = 0;
    mockNitroFetch.mockImplementation(async (_url, init) => {
      call += 1;
      const body = JSON.parse(String(init?.body)) as { response_format?: { type: string } };
      if (call === 1) {
        expect(body.response_format).toEqual({ type: 'json_object' });
        return {
          ok: false,
          text: async () =>
            JSON.stringify({
              error: "'response_format.type' must be 'json_schema' or 'text'",
            }),
        } as Response;
      }
      expect(body.response_format).toBeUndefined();
      return mockChatCompletion({
        content: '{"meetingDialogueMarkdown":"Speaker 1: Ok"}',
      });
    });

    const result = await runPrivateRemoteMeetingDialogue(
      {
        transcript: 'short transcript',
        phase1: { suggestedTitle: 'T', summary: 'S', keyPhrases: [] },
      },
      createCtx({ privateRemotePreferJsonObject: true }),
    );

    expect(result.ok).toBe(true);
    expect(mockNitroFetch).toHaveBeenCalledTimes(2);
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
      createCtx({ privateRemotePreferJsonObject: false }),
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
