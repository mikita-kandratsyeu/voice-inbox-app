jest.mock('react-native-quick-crypto', () => ({
  __esModule: true,
  createHash: () => ({
    update: jest.fn().mockReturnThis(),
    digest: () => 'deadbeef',
  }),
}));

jest.mock('../localLlmSession', () => ({
  completeLocalChat: jest.fn(),
}));

jest.mock('@/shared/lib', () => ({
  i18n: {
    t: (key: string) => key,
  },
}));

import { DEFAULT_LOCAL_AI_MODEL_ID } from '@/entities/settings/model/constants';

import { completeLocalChat } from '../localLlmSession';
import {
  extractBalancedJsonObject,
  extractJsonObjectLoose,
  getLocalReferenceDateIsoLocal,
  getTranscriptCharLimit,
  LocalAiError,
  normalizeClassification,
  normalizeDeadline,
  parseJsonObjectWithFallbacks,
  parseLocalAskResponse,
  parseLocalSummaryResponse,
  repairCommonJsonIssues,
  runLocalAsk,
  runLocalSummaryTasks,
  sanitizeStringArray,
  sanitizeSummaryPayload,
  sanitizeTasks,
  truncateTranscriptSmart,
} from '../localProvider';
import type { AiExecutionContext, AskRequest } from '../types';

const mockedCompleteLocalChat = jest.mocked(completeLocalChat);

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
    ...overrides,
    aiModelRoutingMode: overrides.aiModelRoutingMode ?? 'manual',
  };
}

describe('getTranscriptCharLimit', () => {
  it('uses tier table only (no hidden global cap)', () => {
    expect(getTranscriptCharLimit('full')).toBe(14_000);
    expect(getTranscriptCharLimit('limited')).toBe(5000);
    expect(getTranscriptCharLimit('unavailable')).toBe(5000);
  });
});

describe('truncateTranscriptSmart', () => {
  it('returns input unchanged when under limit', () => {
    const t = 'hello world';
    expect(truncateTranscriptSmart(t, 100)).toBe(t);
  });

  it('returns empty string for empty input', () => {
    expect(truncateTranscriptSmart('', 10)).toBe('');
  });

  it('is deterministic and preserves head and tail', () => {
    const t = 'A'.repeat(100);
    const out = truncateTranscriptSmart(t, 40);
    expect(out.length).toBe(40);
    expect(out.startsWith('A')).toBe(true);
    expect(out.endsWith('A')).toBe(true);
    expect(out).toContain('[...]');
    expect(truncateTranscriptSmart(t, 40)).toBe(out);
  });

  it('head-only when limit too small for marker', () => {
    const t = 'abcdefghijklmnop';
    expect(truncateTranscriptSmart(t, 8)).toBe('abcdefgh');
  });

  it('handles exact limit equal to transcript length', () => {
    const t = 'abc';
    expect(truncateTranscriptSmart(t, 3)).toBe('abc');
  });

  it('preserves unicode code units consistently', () => {
    const t = '你好'.repeat(2000);
    const limit = 100;
    const out = truncateTranscriptSmart(t, limit);
    expect(out.length).toBe(limit);
  });
});

describe('getLocalReferenceDateIsoLocal', () => {
  it('returns YYYY-MM-DD', () => {
    const s = getLocalReferenceDateIsoLocal();
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('matches local calendar (same as manual formatting)', () => {
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(getLocalReferenceDateIsoLocal()).toBe(expected);
  });
});

describe('repairCommonJsonIssues', () => {
  it('strips trailing commas before } or ]', () => {
    expect(repairCommonJsonIssues('{"a":1,}')).toBe('{"a":1}');
    expect(repairCommonJsonIssues('{"a":[1,2,],}')).toBe('{"a":[1,2]}');
  });

  it('is idempotent on valid JSON', () => {
    const s = '{"a":1,"b":[1,2]}';
    expect(repairCommonJsonIssues(s)).toBe(s);
  });
});

describe('parseJsonObjectWithFallbacks', () => {
  it('parses fenced JSON', () => {
    const raw = '```json\n{"summary":"x","tasks":[]}\n```';
    expect(parseJsonObjectWithFallbacks(raw).summary).toBe('x');
  });

  it('parses fenced JSON without json label', () => {
    const raw = '```\n{"summary":"f","tasks":[]}\n```';
    expect(parseJsonObjectWithFallbacks(raw).summary).toBe('f');
  });

  it('handles opening fence without closing (takes rest as body)', () => {
    const raw = '```json\n{"summary":"open","tasks":[]}';
    const o = parseJsonObjectWithFallbacks(raw);
    expect(o.summary).toBe('open');
  });

  it('extracts balanced object from prose prefix and suffix', () => {
    const raw = 'Here: {"summary":"y","tasks":[]} done.';
    expect(parseJsonObjectWithFallbacks(raw).summary).toBe('y');
  });

  it('repairs trailing comma', () => {
    const raw = '{"summary":"z","tasks":[],}';
    expect(parseJsonObjectWithFallbacks(raw).summary).toBe('z');
  });

  it('parses raw object without extra prose when valid', () => {
    const raw = '{"summary":"plain","tasks":[],"tags":[]}';
    expect(parseJsonObjectWithFallbacks(raw).summary).toBe('plain');
  });

  it('parses unicode and escaped quotes inside strings', () => {
    const raw = '{"summary":"line\\"one\\nкириллица 🔧","tasks":[]}';
    const o = parseJsonObjectWithFallbacks(raw);
    expect(o.summary).toBe('line"one\nкириллица 🔧');
  });

  it('rejects top-level JSON array', () => {
    expect(() => parseJsonObjectWithFallbacks('[{"summary":"x"}]')).toThrow(LocalAiError);
    try {
      parseJsonObjectWithFallbacks('[{"summary":"x"}]');
    } catch (e) {
      expect(e).toBeInstanceOf(LocalAiError);
      expect((e as LocalAiError).code).toBe('parse_failed');
    }
  });

  it('throws parse_failed on unrecoverable garbage', () => {
    expect(() => parseJsonObjectWithFallbacks('not json {{{')).toThrow(LocalAiError);
  });

  it('throws parse_failed on empty after strip', () => {
    expect(() => parseJsonObjectWithFallbacks('   ')).toThrow(LocalAiError);
  });

  it('uses loose slice when balanced extraction fails on truncated blob', () => {
    const raw = '{"summary":"truncated","tasks":[{"title":"a"';
    expect(() => parseJsonObjectWithFallbacks(raw)).toThrow(LocalAiError);
  });
});

describe('extractBalancedJsonObject / extractJsonObjectLoose', () => {
  it('balanced respects strings with braces', () => {
    const s = 'x{"a":"}"}y';
    expect(extractBalancedJsonObject(s)).toBe('{"a":"}"}');
  });

  it('balanced returns null when brace never closes', () => {
    expect(extractBalancedJsonObject('{"a":1')).toBe(null);
  });

  it('loose slices first { to last }', () => {
    const s = 'prefix {"k":1} suffix }';
    expect(extractJsonObjectLoose(s)).toBe('{"k":1} suffix }');
  });

  it('loose returns null without braces', () => {
    expect(extractJsonObjectLoose('no braces')).toBe(null);
  });

  it('picks first complete object when two exist', () => {
    const s = '{"a":1}{"b":2}';
    expect(extractBalancedJsonObject(s)).toBe('{"a":1}');
  });
});

describe('normalizeDeadline', () => {
  it('accepts valid calendar dates', () => {
    expect(normalizeDeadline('2024-03-01')).toBe('2024-03-01');
    expect(normalizeDeadline('2024-02-29')).toBe('2024-02-29');
  });

  it('accepts ISO datetime and keeps date part', () => {
    expect(normalizeDeadline('2026-06-13T18:00:00+03:00')).toBe('2026-06-13');
  });

  it('rejects invalid calendar dates', () => {
    expect(normalizeDeadline('2024-02-30')).toBe(null);
    expect(normalizeDeadline('2023-02-29')).toBe(null);
  });

  it('null for empty or bad format', () => {
    expect(normalizeDeadline('')).toBe(null);
    expect(normalizeDeadline('tomorrow')).toBe(null);
    expect(normalizeDeadline(null)).toBe(null);
    expect(normalizeDeadline('2024/03/01')).toBe(null);
  });

  it('treats string "null" and whitespace as null', () => {
    expect(normalizeDeadline('null')).toBe(null);
    expect(normalizeDeadline('  null  ')).toBe(null);
  });

  it('rejects non-string types', () => {
    expect(normalizeDeadline(20240101 as unknown as string)).toBe(null);
  });
});

describe('normalizeClassification', () => {
  it('normalizes case', () => {
    expect(normalizeClassification('WORK')).toBe('work');
  });

  it('undefined for unknown', () => {
    expect(normalizeClassification('nope')).toBeUndefined();
  });

  it('undefined for non-string', () => {
    expect(normalizeClassification(1)).toBeUndefined();
  });

  it('accepts all enum values', () => {
    (['personal', 'work', 'meeting', 'idea', 'other'] as const).forEach((c) => {
      expect(normalizeClassification(c)).toBe(c);
    });
  });
});

describe('sanitizeStringArray', () => {
  it('returns [] for non-array', () => {
    expect(sanitizeStringArray('x', { max: 5, dedupeCaseInsensitive: true })).toEqual([]);
  });

  it('dedupes case-insensitively and caps', () => {
    const out = sanitizeStringArray(['A', 'a', 'B', 'b', 'c'], {
      max: 3,
      dedupeCaseInsensitive: true,
    });
    expect(out).toEqual(['A', 'B', 'c']);
  });

  it('lowercases tags when requested', () => {
    const out = sanitizeStringArray(['Foo', 'BAR'], {
      max: 5,
      dedupeCaseInsensitive: true,
      lowercase: true,
    });
    expect(out).toEqual(['foo', 'bar']);
  });

  it('skips non-strings and empty entries', () => {
    expect(
      sanitizeStringArray(['a', '', '  ', 1, null, 'b'] as unknown as string[], {
        max: 10,
        dedupeCaseInsensitive: false,
      }),
    ).toEqual(['a', 'b']);
  });

  it('dedupe without case fold when dedupeCaseInsensitive false', () => {
    expect(sanitizeStringArray(['A', 'a'], { max: 5, dedupeCaseInsensitive: false })).toEqual([
      'A',
      'a',
    ]);
  });
});

describe('sanitizeTasks', () => {
  it('caps tasks and normalizes deadline', () => {
    const tasks = Array.from({ length: 30 }, (_, i) => ({
      title: `t${i}`,
      priority: 'HIGH',
      deadline: 'not-a-date',
    }));
    const out = sanitizeTasks(tasks);
    expect(out).toHaveLength(25);
    expect(out[0].priority).toBe('high');
    expect(out[0].deadline).toBe(null);
  });

  it('drops items without title', () => {
    expect(sanitizeTasks([{ title: '   ' }, { title: 'ok' }])).toEqual([
      { title: 'ok', priority: 'medium', deadline: null },
    ]);
  });

  it('skips null, arrays, and non-objects', () => {
    expect(sanitizeTasks([null, [], {}, { title: 'x' }] as unknown[])).toEqual([
      { title: 'x', priority: 'medium', deadline: null },
    ]);
  });

  it('defaults unknown priority to medium', () => {
    expect(sanitizeTasks([{ title: 't', priority: 'urgent' }])).toEqual([
      { title: 't', priority: 'medium', deadline: null },
    ]);
  });

  it('splits ISO datetime into deadline and deadlineTime', () => {
    expect(
      sanitizeTasks([
        { title: 'Pick up suit', priority: 'high', deadline: '2026-06-13T18:00:00+03:00' },
      ]),
    ).toEqual([
      {
        title: 'Pick up suit',
        priority: 'high',
        deadline: '2026-06-13',
        deadlineTime: expect.stringMatching(/^\d{2}:\d{2}$/),
      },
    ]);
  });
});

describe('sanitizeSummaryPayload', () => {
  it('throws empty_summary when summary missing or blank', () => {
    expect(() => sanitizeSummaryPayload({ tasks: [] })).toThrow(LocalAiError);
    expect(() => sanitizeSummaryPayload({ summary: '   ' })).toThrow(LocalAiError);
    try {
      sanitizeSummaryPayload({ summary: '' });
    } catch (e) {
      expect((e as LocalAiError).code).toBe('empty_summary');
    }
  });

  it('throws when summary is not a string', () => {
    expect(() => sanitizeSummaryPayload({ summary: 123 as unknown as string })).toThrow(
      LocalAiError,
    );
  });

  it('clips suggestedTitle to max length', () => {
    const long = 'x'.repeat(120);
    const r = sanitizeSummaryPayload({ summary: 'ok', suggestedTitle: long });
    expect(r.suggestedTitle!.length).toBe(100);
  });

  it('enforces field caps', () => {
    const r = sanitizeSummaryPayload({
      summary: 's',
      tags: ['a', 'b', 'c', 'd', 'e', 'f'],
      keyPhrases: Array.from({ length: 12 }, (_, i) => `k${i}`),
      nextSteps: ['a', 'b', 'c', 'd'],
    });
    expect(r.tags).toHaveLength(5);
    expect(r.keyPhrases!.length).toBe(8);
    expect(r.nextSteps!.length).toBe(3);
  });

  it('omits classification when invalid', () => {
    const r = sanitizeSummaryPayload({ summary: 'x', classification: 'unknown' });
    expect(r.classification).toBeUndefined();
  });
});

describe('parseLocalSummaryResponse', () => {
  it('returns sanitized result', () => {
    const raw = JSON.stringify({
      summary: '  Main point  ',
      suggestedTitle: '  Title  ',
      tasks: [{ title: '  Do X  ', priority: 'low', deadline: '2025-01-15' }],
      tags: ['A', 'a', 'b'],
      classification: 'IDEA',
      keyPhrases: ['x', 'x'],
      nextSteps: ['s1', 's2'],
    });
    const r = parseLocalSummaryResponse(raw);
    expect(r.summary).toBe('Main point');
    expect(r.suggestedTitle).toBe('Title');
    expect(r.tasks[0].deadline).toBe('2025-01-15');
    expect(r.tags).toEqual(['a', 'b']);
    expect(r.classification).toBe('idea');
    expect(r.keyPhrases).toEqual(['x']);
  });

  it('throws parse_failed on invalid JSON', () => {
    expect(() => parseLocalSummaryResponse('{')).toThrow(LocalAiError);
  });
});

describe('parseLocalAskResponse', () => {
  it('reads JSON answer', () => {
    expect(parseLocalAskResponse('{"answer":"hello"}')).toEqual({ answer: 'hello' });
  });

  it('reads structured ask metadata', () => {
    expect(
      parseLocalAskResponse(
        '{"answer":"Do the launch prep.","answerKind":"tasks","items":["Write copy","Ship build"],"evidence":[{"quote":"We need to ship the build","source":"transcript"}],"suggestedFollowUps":["Who owns the build?"]}',
      ),
    ).toEqual({
      answer: 'Do the launch prep.',
      answerKind: 'tasks',
      items: ['Write copy', 'Ship build'],
      evidence: [{ quote: 'We need to ship the build', source: 'transcript' }],
      suggestedFollowUps: ['Who owns the build?'],
    });
  });

  it('reads cautious interpretations separately from grounded answer', () => {
    expect(
      parseLocalAskResponse(
        '{"answer":"The note mentions a delay but no date.","interpretations":["The tone suggests schedule risk."],"evidence":[]}',
      ),
    ).toEqual({
      answer: 'The note mentions a delay but no date.',
      interpretations: ['The tone suggests schedule risk.'],
    });
  });

  it('reads answer from code fence', () => {
    expect(parseLocalAskResponse('```json\n{"answer":"from fence"}\n```')).toEqual({
      answer: 'from fence',
    });
  });

  it('trims JSON answer whitespace', () => {
    expect(parseLocalAskResponse('{"answer":"  spaced  "}')).toEqual({ answer: 'spaced' });
  });

  it('returns null for empty JSON answer string', () => {
    expect(parseLocalAskResponse('{"answer":""}')).toBe(null);
    expect(parseLocalAskResponse('{"answer":"   "}')).toBe(null);
  });

  it('repairs trailing comma in ask JSON', () => {
    expect(parseLocalAskResponse('{"answer":"ok",}')).toEqual({ answer: 'ok' });
  });

  it('recovers answer when JSON is truncated before closing quote', () => {
    expect(parseLocalAskResponse('{"answer":"answer truncated')).toEqual({
      answer: 'answer truncated',
    });
  });

  it('recovers answer with escapes when truncated', () => {
    expect(parseLocalAskResponse('{"answer":"line one\\nline two')).toEqual({
      answer: 'line one\nline two',
    });
  });

  it('allows plain text when plausible', () => {
    expect(parseLocalAskResponse('This is a normal reply.')).toEqual({
      answer: 'This is a normal reply.',
    });
  });

  it('allows Cyrillic plain text', () => {
    expect(parseLocalAskResponse('Ответ на русском.')).toEqual({ answer: 'Ответ на русском.' });
  });

  it('rejects junk plain text', () => {
    expect(parseLocalAskResponse('!!!')).toBe(null);
    expect(parseLocalAskResponse('{broken')).toBe(null);
  });

  it('rejects plain text that looks like JSON start', () => {
    expect(parseLocalAskResponse('{"not":"answer"}')).toBe(null);
  });

  it('rejects oversized plain text', () => {
    const huge = 'a'.repeat(12_001);
    expect(parseLocalAskResponse(huge)).toBe(null);
  });

  it('rejects plain text with too many control characters', () => {
    const bad = '\x00\x00\x00\x00\x00hello';
    expect(parseLocalAskResponse(bad)).toBe(null);
  });
});

describe('runLocalSummaryTasks (integration)', () => {
  beforeEach(() => {
    mockedCompleteLocalChat.mockReset();
  });

  it('returns ok with parsed result on valid model output', async () => {
    const payload = {
      summary: 'Done',
      tasks: [],
      tags: [],
      keyPhrases: [],
      nextSteps: [],
    };
    mockedCompleteLocalChat.mockResolvedValue(JSON.stringify(payload));

    const res = await runLocalSummaryTasks({ id: '1', transcript: 'short note' }, createCtx());

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.result.summary).toBe('Done');
      expect(res.provider).toBe('local');
    }
    expect(mockedCompleteLocalChat).toHaveBeenCalledTimes(1);
    expect(mockedCompleteLocalChat).toHaveBeenCalledWith(
      DEFAULT_LOCAL_AI_MODEL_ID,
      expect.any(Array),
      expect.objectContaining({ maxTokens: 1538, temperature: 0.2, intent: 'json' }),
    );
  });

  it('uses larger maxTokens when private local budget is expanded', async () => {
    mockedCompleteLocalChat.mockResolvedValue(
      JSON.stringify({
        summary: 'x',
        tasks: [],
        tags: [],
        keyPhrases: [],
        nextSteps: [],
      }),
    );

    await runLocalSummaryTasks(
      { id: '1', transcript: 'note' },
      createCtx({ privateLocalLlmBudget: 'expanded' }),
    );

    expect(mockedCompleteLocalChat).toHaveBeenCalledWith(
      DEFAULT_LOCAL_AI_MODEL_ID,
      expect.any(Array),
      expect.objectContaining({ maxTokens: 2048, temperature: 0.2, intent: 'json' }),
    );
  });

  it('retries once with stricter instructions when first response is malformed', async () => {
    mockedCompleteLocalChat
      .mockResolvedValueOnce('not json')
      .mockResolvedValueOnce(JSON.stringify({ summary: 'second try', tasks: [] }));

    const res = await runLocalSummaryTasks({ id: '1', transcript: 't' }, createCtx());

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.result.summary).toBe('second try');
    expect(mockedCompleteLocalChat).toHaveBeenCalledTimes(2);
    const secondMessages = mockedCompleteLocalChat.mock.calls[1][1] as {
      role: string;
      content: string;
    }[];
    const secondUser = secondMessages.find((m) => m.role === 'user')?.content ?? '';
    expect(secondUser).toContain('Return JSON only');
  });

  it('returns parse error key when both attempts fail', async () => {
    mockedCompleteLocalChat.mockResolvedValue('garbage');

    const res = await runLocalSummaryTasks({ id: '1', transcript: 't' }, createCtx());

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('ai.privateModeParseFailed');
    expect(mockedCompleteLocalChat).toHaveBeenCalledTimes(2);
  });

  it('maps model file missing to download i18n key', async () => {
    mockedCompleteLocalChat.mockRejectedValue(new Error('Local LLM model file missing'));

    const res = await runLocalSummaryTasks({ id: '1', transcript: 't' }, createCtx());

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('ai.privateModeModelNotDownloaded');
  });

  it('includes smart-truncated transcript in user message for long input', async () => {
    const transcript = 'Z'.repeat(20_000);
    mockedCompleteLocalChat.mockResolvedValue(JSON.stringify({ summary: 'ok', tasks: [] }));

    await runLocalSummaryTasks(
      { id: '1', transcript },
      createCtx({ privateCapabilityTier: 'full' }),
    );

    const userMsg = (
      mockedCompleteLocalChat.mock.calls[0][1] as { role: string; content: string }[]
    ).find((m) => m.role === 'user')!;
    expect(userMsg.content.length).toBeLessThan(transcript.length);
    expect(userMsg.content).toContain('[...]');
    expect(userMsg.content).toContain('Transcript:');
  });

  it('uses limited tier cap in truncation', async () => {
    const transcript = 'Y'.repeat(8000);
    mockedCompleteLocalChat.mockResolvedValue(JSON.stringify({ summary: 'ok', tasks: [] }));

    await runLocalSummaryTasks(
      { id: '1', transcript },
      createCtx({ privateCapabilityTier: 'limited' }),
    );

    const userMsg = (
      mockedCompleteLocalChat.mock.calls[0][1] as { role: string; content: string }[]
    ).find((m) => m.role === 'user')!;
    expect(userMsg.content.length).toBeLessThan(transcript.length + 500);
  });
});

describe('runLocalAsk (integration)', () => {
  beforeEach(() => {
    mockedCompleteLocalChat.mockReset();
  });

  const askRequest: AskRequest = {
    id: 'a1',
    transcript: 'Meeting about budget.',
    question: 'What was the main topic?',
  };

  it('returns answer on valid JSON', async () => {
    mockedCompleteLocalChat.mockResolvedValue(JSON.stringify({ answer: 'Budget.' }));

    const res = await runLocalAsk(askRequest, createCtx());

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.result.answer).toBe('Budget.');
    expect(mockedCompleteLocalChat).toHaveBeenCalledWith(
      DEFAULT_LOCAL_AI_MODEL_ID,
      expect.any(Array),
      expect.objectContaining({ maxTokens: 450, temperature: 0.25, intent: 'json' }),
    );
  });

  it('retries once when first output is unusable', async () => {
    mockedCompleteLocalChat
      .mockResolvedValueOnce('!!!')
      .mockResolvedValueOnce(JSON.stringify({ answer: 'Retry ok.' }));

    const res = await runLocalAsk(askRequest, createCtx());

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.result.answer).toBe('Retry ok.');
    expect(mockedCompleteLocalChat).toHaveBeenCalledTimes(2);
  });

  it('returns empty answer i18n key when both attempts fail', async () => {
    mockedCompleteLocalChat.mockResolvedValue('{}');

    const res = await runLocalAsk(askRequest, createCtx());

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('ai.privateModeEmptyAnswer');
    expect(mockedCompleteLocalChat).toHaveBeenCalledTimes(2);
  });

  it('accepts plausible plain text without retry', async () => {
    mockedCompleteLocalChat.mockResolvedValue('Plain sentence answer.');

    const res = await runLocalAsk(askRequest, createCtx());

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.result.answer).toBe('Plain sentence answer.');
    expect(mockedCompleteLocalChat).toHaveBeenCalledTimes(1);
  });

  it('builds user content with trimmed question and optional summary/tasks', async () => {
    mockedCompleteLocalChat.mockResolvedValue(JSON.stringify({ answer: 'ok' }));

    await runLocalAsk(
      {
        id: 'x',
        transcript: '  tr  ',
        question: '  q?  ',
        summary: 'sum',
        tasks: [{ text: '  one  ' }, { text: '' }, { text: 'two' }],
      },
      createCtx(),
    );

    const userMsg = (
      mockedCompleteLocalChat.mock.calls[0][1] as { role: string; content: string }[]
    ).find((m) => m.role === 'user')!;
    expect(userMsg.content).toContain('Transcript:\n  tr');
    expect(userMsg.content).toContain('Question:\nq?');
    expect(userMsg.content.indexOf('Transcript:')).toBeLessThan(
      userMsg.content.indexOf('Question:'),
    );
    expect(userMsg.content).toContain('Summary:\nsum');
    expect(userMsg.content).toContain('- one');
    expect(userMsg.content).toContain('- two');
    expect(userMsg.content.match(/^- /gm)?.length).toBe(2);
  });

  it('includes prior turns before the current question', async () => {
    mockedCompleteLocalChat.mockResolvedValue(JSON.stringify({ answer: 'ok' }));

    await runLocalAsk(
      {
        id: 'x',
        transcript: 'Meeting notes.',
        question: 'What next?',
        priorTurns: [{ question: 'Main topic?', answer: 'Budget.' }],
      },
      createCtx(),
    );

    const userMsg = (
      mockedCompleteLocalChat.mock.calls[0][1] as { role: string; content: string }[]
    ).find((m) => m.role === 'user')!;
    expect(userMsg.content).toContain('Prior conversation');
    expect(userMsg.content).toContain('Q: Main topic?');
    expect(userMsg.content).toContain('A: Budget.');
    expect(userMsg.content.indexOf('What next?')).toBeGreaterThan(
      userMsg.content.indexOf('A: Budget.'),
    );
  });

  it('uses larger ask maxTokens when private local budget is expanded', async () => {
    mockedCompleteLocalChat.mockResolvedValue(JSON.stringify({ answer: 'ok' }));

    await runLocalAsk(askRequest, createCtx({ privateLocalLlmBudget: 'expanded' }));

    expect(mockedCompleteLocalChat).toHaveBeenCalledWith(
      DEFAULT_LOCAL_AI_MODEL_ID,
      expect.any(Array),
      expect.objectContaining({ maxTokens: 600, temperature: 0.25, intent: 'json' }),
    );
  });
});
