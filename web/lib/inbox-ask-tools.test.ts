import {
  INBOX_ASK_TOOL_DEFINITIONS,
  parseStoredInboxAskToolCall,
  safeParseToolArguments,
  validateInboxAskToolResult,
} from '@/lib/inbox-ask-tools';

describe('inbox ask tools', () => {
  it('defines only read-only note tools', () => {
    expect(INBOX_ASK_TOOL_DEFINITIONS.map((tool) => tool.function.name)).toEqual([
      'search_notes',
      'get_note',
      'list_tasks',
      'get_related_notes',
    ]);
  });

  it('parses OpenAI-compatible function argument payloads safely', () => {
    expect(safeParseToolArguments('{"query":"launch","limit":3}')).toEqual({
      query: 'launch',
      limit: 3,
    });
    expect(safeParseToolArguments('not json')).toEqual({});
  });

  it('parses stored needs_tool payloads from KV', () => {
    expect(
      parseStoredInboxAskToolCall({
        toolCallId: 'call_search_1',
        toolName: 'search_notes',
        arguments: { query: 'budget' },
        round: 1,
        expiresAt: '2026-06-24T12:00:00.000Z',
      }),
    ).toEqual({
      toolCallId: 'call_search_1',
      toolName: 'search_notes',
      arguments: { query: 'budget' },
      round: 1,
      expiresAt: '2026-06-24T12:00:00.000Z',
    });
  });

  it('rejects oversized or mismatched tool results', () => {
    expect(
      validateInboxAskToolResult({
        toolCallId: 'call-1',
        toolName: 'search_notes',
        round: 1,
        result: {
          toolName: 'search_notes',
          query: 'launch',
          notes: [],
          totalCorpusCount: 0,
          droppedCount: 0,
          retrievalMode: 'lexical',
        },
      }),
    ).toBe(true);

    expect(
      validateInboxAskToolResult({
        toolCallId: 'call-1',
        toolName: 'get_note',
        round: 1,
        result: {
          toolName: 'search_notes',
          query: 'x'.repeat(20_000),
          notes: [],
          totalCorpusCount: 0,
          droppedCount: 0,
          retrievalMode: 'lexical',
        },
      }),
    ).toBe(false);
  });
});
