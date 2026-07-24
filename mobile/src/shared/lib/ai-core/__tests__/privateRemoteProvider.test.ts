import { DEFAULT_LOCAL_AI_MODEL_ID } from '@/entities/settings/model/constants';

import { PRIVATE_REMOTE_HEALTH_CHECK_TIMEOUT_MS } from '../private-remote/privateRemoteConstants';
import {
  listPrivateRemoteModels,
  resetPrivateRemoteFormatCapabilityCacheForTests,
  runPrivateRemoteInboxAsk,
  runPrivateRemoteMeetingDialogue,
  testPrivateRemoteConnection,
} from '../privateRemoteProvider';
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

function mockChatCompletionWithTools(payload: {
  content?: string;
  toolCalls?: unknown[];
  model?: string;
}): Response {
  return {
    ok: true,
    json: async () => ({
      model: payload.model ?? 'test/model',
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
      },
      choices: [
        {
          message: {
            content: payload.content ?? null,
            ...(payload.toolCalls ? { tool_calls: payload.toolCalls } : {}),
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
  beforeEach(() => {
    resetPrivateRemoteFormatCapabilityCacheForTests();
  });

  afterEach(() => {
    mockNitroFetch.mockReset();
  });

  it('sends json_schema first when preferJsonObject is enabled', async () => {
    mockNitroFetch.mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as {
        response_format?: { type: string; json_schema?: { name: string } };
      };
      expect(body.response_format?.type).toBe('json_schema');
      expect(body.response_format?.json_schema?.name).toBe('voice_inbox_meeting_dialogue');
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

  it('retries with json_object when server rejects json_schema', async () => {
    let call = 0;
    mockNitroFetch.mockImplementation(async (_url, init) => {
      call += 1;
      const body = JSON.parse(String(init?.body)) as { response_format?: { type: string } };
      if (call === 1) {
        expect(body.response_format?.type).toBe('json_schema');
        return {
          ok: false,
          text: async () => 'response_format json_schema is not supported',
        } as Response;
      }
      expect(body.response_format).toEqual({ type: 'json_object' });
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

  it('retries with max_completion_tokens when server rejects max_tokens', async () => {
    let call = 0;
    mockNitroFetch.mockImplementation(async (_url, init) => {
      call += 1;
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      if (call === 1) {
        expect(body.max_tokens).toBeDefined();
        expect(body.max_completion_tokens).toBeUndefined();
        return {
          ok: false,
          text: async () =>
            JSON.stringify({
              error: {
                message:
                  "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.",
                type: 'invalid_request_error',
                param: 'max_tokens',
                code: 'unsupported_parameter',
              },
            }),
        } as Response;
      }
      expect(body.max_completion_tokens).toBeDefined();
      expect(body.max_tokens).toBeUndefined();
      return mockChatCompletion({
        content: '{"meetingDialogueMarkdown":"Speaker 1: Ok"}',
      });
    });

    const result = await runPrivateRemoteMeetingDialogue(
      {
        transcript: 'short transcript',
        phase1: { suggestedTitle: 'T', summary: 'S', keyPhrases: [] },
      },
      createCtx({ privateRemotePreferJsonObject: false }),
    );

    expect(result.ok).toBe(true);
    expect(mockNitroFetch).toHaveBeenCalledTimes(2);
  });

  it('succeeds with json_schema on first try for LM Studio-style servers', async () => {
    mockNitroFetch.mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as {
        response_format?: { type: string; json_schema?: { name: string } };
      };
      expect(body.response_format?.type).toBe('json_schema');
      expect(body.response_format?.json_schema?.name).toBe('voice_inbox_meeting_dialogue');
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
    expect(mockNitroFetch).toHaveBeenCalledTimes(1);
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

describe('testPrivateRemoteConnection', () => {
  beforeEach(() => {
    resetPrivateRemoteFormatCapabilityCacheForTests();
    mockNitroFetch.mockReset();
  });

  it('retries ping with max_completion_tokens when max_tokens is rejected', async () => {
    let completionCalls = 0;
    mockNitroFetch.mockImplementation(async (url, init) => {
      const urlText = String(url);
      if (urlText.endsWith('/models')) {
        return {
          ok: true,
          json: async () => ({ data: [{ id: 'gpt-test' }] }),
        } as Response;
      }
      completionCalls += 1;
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      if (completionCalls === 1) {
        expect(body.max_tokens).toBe(32);
        return {
          ok: false,
          text: async () =>
            JSON.stringify({
              error: {
                message:
                  "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.",
              },
            }),
        } as Response;
      }
      expect(body.max_completion_tokens).toBe(32);
      return mockChatCompletion({ content: 'pong' });
    });

    const result = await testPrivateRemoteConnection({
      privateRemoteBaseUrl: 'http://127.0.0.1:1234',
      privateRemoteApiKey: '',
      privateRemoteModel: 'gpt-test',
    });

    expect(result.ok).toBe(true);
    expect(completionCalls).toBe(2);
  });

  it('uses a short timeout for manual server checks', async () => {
    mockNitroFetch.mockImplementation(async (url) => {
      const urlText = String(url);
      if (urlText.endsWith('/models')) {
        return {
          ok: true,
          json: async () => ({ data: [{ id: 'gpt-test' }] }),
        } as Response;
      }
      return mockChatCompletion({ content: 'pong' });
    });

    const result = await testPrivateRemoteConnection({
      privateRemoteBaseUrl: 'http://127.0.0.1:1234',
      privateRemoteApiKey: '',
      privateRemoteModel: 'gpt-test',
    });

    expect(result.ok).toBe(true);
    expect(mockNitroFetch).toHaveBeenCalledTimes(2);
    expect(mockNitroFetch).toHaveBeenNthCalledWith(
      1,
      'http://127.0.0.1:1234/v1/models',
      expect.objectContaining({ timeoutMs: PRIVATE_REMOTE_HEALTH_CHECK_TIMEOUT_MS }),
    );
    expect(mockNitroFetch).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:1234/v1/chat/completions',
      expect.objectContaining({ timeoutMs: PRIVATE_REMOTE_HEALTH_CHECK_TIMEOUT_MS }),
    );
  });
});

describe('listPrivateRemoteModels', () => {
  beforeEach(() => {
    mockNitroFetch.mockReset();
  });

  it('maps connection refused to a friendly server-unavailable message', async () => {
    mockNitroFetch.mockRejectedValue(
      new Error(
        'Error Domain=NSURLErrorDomain Code=-1004 "Не удалось подключиться к серверу." UserInfo={kCFStreamErrorDomainKey=1, kCFStreamErrorCodeKey=61}',
      ),
    );

    const result = await listPrivateRemoteModels({
      privateRemoteBaseUrl: 'http://192.168.1.34:1234',
      privateRemoteApiKey: '',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('aiSettings.privateProvider.healthCheck.serverUnavailable');
  });

  it('maps auth failures to a friendly auth message', async () => {
    mockNitroFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    const result = await listPrivateRemoteModels({
      privateRemoteBaseUrl: 'http://127.0.0.1:1234',
      privateRemoteApiKey: 'bad-key',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('aiSettings.privateProvider.healthCheck.authFailed');
  });

  it('maps HTTP errors to a friendly load-failed message', async () => {
    mockNitroFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);

    const result = await listPrivateRemoteModels({
      privateRemoteBaseUrl: 'http://127.0.0.1:1234',
      privateRemoteApiKey: '',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('aiSettings.privateProvider.modelList.loadFailed');
  });
});

describe('runPrivateRemoteInboxAsk', () => {
  beforeEach(() => {
    resetPrivateRemoteFormatCapabilityCacheForTests();
    mockNitroFetch.mockReset();
  });

  it('executes one tool round then returns final answer', async () => {
    let call = 0;
    const toolExecutor = jest.fn(async () => ({
      toolCallId: 'call_1',
      toolName: 'search_notes' as const,
      round: 1,
      result: {
        toolName: 'search_notes' as const,
        query: 'budget',
        notes: [],
        totalCorpusCount: 0,
        droppedCount: 0,
        retrievalMode: 'lexical' as const,
      },
    }));

    mockNitroFetch.mockImplementation(async (_url, init) => {
      call += 1;
      const body = JSON.parse(String(init?.body)) as { tools?: unknown[] };
      if (call === 1) {
        expect(body.tools).toBeDefined();
        return mockChatCompletionWithTools({
          toolCalls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'search_notes', arguments: '{"query":"budget"}' },
            },
          ],
        });
      }
      return mockChatCompletion({
        content: '{"answer":"Based on your notes, the budget is fine."}',
      });
    });

    const result = await runPrivateRemoteInboxAsk(
      {
        id: 'req-1',
        question: 'What about budget?',
        corpusNotes: [{ recordId: 'r1', title: 'Note', summary: 'Budget note' }],
        toolExecutor,
      },
      createCtx(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.answer).toContain('budget');
    expect(toolExecutor).toHaveBeenCalledTimes(1);
    expect(mockNitroFetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to plain ask when server rejects tools', async () => {
    let call = 0;
    mockNitroFetch.mockImplementation(async () => {
      call += 1;
      if (call === 1) {
        return {
          ok: false,
          text: async () => 'tools parameter is not supported',
        } as Response;
      }
      return mockChatCompletion({
        content: '{"answer":"Fallback answer"}',
      });
    });

    const result = await runPrivateRemoteInboxAsk(
      {
        id: 'req-2',
        question: 'Hello?',
        corpusNotes: [],
        toolExecutor: jest.fn(),
      },
      createCtx(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.answer).toBe('Fallback answer');
  });
});
