import { HEADER_AI_OPERATION } from '../config/constants';
import { resolveAiOperation } from './ai-operation';

function request(pathname: string, operationHeader?: string): Request {
  const headers = new Headers();
  if (operationHeader !== undefined) {
    headers.set(HEADER_AI_OPERATION, operationHeader);
  }
  return new Request(`https://example.com${pathname}`, { headers });
}

describe('resolveAiOperation', () => {
  it('uses route default when header is omitted', () => {
    const result = resolveAiOperation(request('/api/ask'), '/api/ask');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.operation).toBe('transcript_ask');
    }
  });

  it('accepts matching header', () => {
    const result = resolveAiOperation(request('/api/translate', 'translate'), '/api/translate');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.operation).toBe('translate');
    }
  });

  it('rejects mismatched header', () => {
    const result = resolveAiOperation(request('/api/ask', 'digest'), '/api/ask');
    expect(result.ok).toBe(false);
  });

  it('resolves meeting dialogue retry path', () => {
    const result = resolveAiOperation(
      request('/api/messages/msg-1/meeting-dialogue'),
      '/api/messages/msg-1/meeting-dialogue',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.operation).toBe('meeting_dialogue_retry');
    }
  });

  it('rejects unknown paths', () => {
    const result = resolveAiOperation(request('/api/unknown'), '/api/unknown');
    expect(result.ok).toBe(false);
  });
});
