import { extractJsonObjectSlice, parseOpenRouterJsonContent } from './parse-openrouter-json';

describe('parse-openrouter-json', () => {
  it('extractJsonObjectSlice strips fences and isolates object', () => {
    const raw = '```json\n{"folders":[]}\n```';
    expect(extractJsonObjectSlice(raw)).toBe('{"folders":[]}');
  });

  it('parseOpenRouterJsonContent parses fenced JSON', () => {
    const parsed = parseOpenRouterJsonContent('```json\n{"ok":true}\n```') as { ok: boolean };
    expect(parsed.ok).toBe(true);
  });

  it('parseOpenRouterJsonContent throws on empty content', () => {
    expect(() => parseOpenRouterJsonContent('   ')).toThrow(/empty content/);
  });

  it('parseOpenRouterJsonContent throws on malformed JSON', () => {
    expect(() => parseOpenRouterJsonContent('{ broken')).toThrow(/non-JSON/);
  });
});
