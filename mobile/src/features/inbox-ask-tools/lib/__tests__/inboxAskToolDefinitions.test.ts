import {
  extractFirstInboxAskToolCall,
  isInboxAskToolName,
  isToolUnsupportedError,
  safeParseToolArguments,
} from '../inboxAskToolDefinitions';

describe('inboxAskToolDefinitions', () => {
  it('parses tool arguments from JSON string', () => {
    expect(safeParseToolArguments('{"query":"budget"}')).toEqual({ query: 'budget' });
    expect(safeParseToolArguments({ query: 'budget' })).toEqual({ query: 'budget' });
    expect(safeParseToolArguments('not-json')).toEqual({});
  });

  it('validates inbox ask tool names', () => {
    expect(isInboxAskToolName('search_notes')).toBe(true);
    expect(isInboxAskToolName('delete_note')).toBe(false);
  });

  it('extracts first supported tool call', () => {
    const call = extractFirstInboxAskToolCall(
      [
        {
          id: 'call_1',
          type: 'function',
          function: { name: 'search_notes', arguments: '{"query":"meetings"}' },
        },
      ],
      1,
    );
    expect(call).toEqual({
      toolCallId: 'call_1',
      toolName: 'search_notes',
      arguments: { query: 'meetings' },
      round: 1,
    });
  });

  it('detects tool unsupported errors', () => {
    expect(isToolUnsupportedError(new Error('tools parameter is not supported'))).toBe(true);
    expect(isToolUnsupportedError(new Error('connection refused'))).toBe(false);
  });
});
