jest.mock('@/lib/ai-model-fallback', () => ({
  isRetryableOpenRouterTransportError: jest.fn(() => false),
}));

jest.mock('@/lib/deepseek', () => ({
  isRetryableDeepSeekTransportError: jest.fn(() => false),
}));

jest.mock('@/lib/openrouter-recovery', () => ({
  isOpenRouterRecoverableTransportError: jest.fn(() => false),
}));

import { isRetryableAiJobError } from './ai-job-retry';

describe('isRetryableAiJobError', () => {
  it('returns true for retryable transport failures', () => {
    expect(isRetryableAiJobError(new Error('OpenRouter chat failed (503)'))).toBe(true);
    expect(isRetryableAiJobError(new Error('Job payload missing or operation mismatch'))).toBe(
      true,
    );
  });

  it('returns false for generic app errors', () => {
    expect(isRetryableAiJobError(new Error('Invalid transcript'))).toBe(false);
    expect(isRetryableAiJobError('network')).toBe(false);
  });
});
