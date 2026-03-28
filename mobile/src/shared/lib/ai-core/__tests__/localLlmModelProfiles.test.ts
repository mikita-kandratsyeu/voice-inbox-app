import type { LocalAiModelId } from '@/entities/settings';
import { DEFAULT_LOCAL_AI_MODEL_ID } from '@/entities/settings/model/constants';

import { getLocalLlmContextParams, mergeLocalLlmCompletionParams } from '../localLlmModelProfiles';

const ALL_LOCAL_IDS: LocalAiModelId[] = [
  DEFAULT_LOCAL_AI_MODEL_ID,
  'local/llama-3.2-1b-q4_k_m',
  'local/gemma-2-2b-it-q4_k_m',
];

describe('localLlmModelProfiles', () => {
  it('uses single parallel slot and bounded batches (memory)', () => {
    expect(getLocalLlmContextParams()).toMatchObject({
      n_parallel: 1,
      n_batch: 512,
      n_ubatch: 256,
    });
  });

  it.each(ALL_LOCAL_IDS)('defines json + chat completion layers for %s', (id) => {
    const json = mergeLocalLlmCompletionParams(id, 'json');
    const chat = mergeLocalLlmCompletionParams(id, 'chat');

    expect(json.enable_thinking).toBe(false);
    expect(chat.enable_thinking).toBe(false);
    expect(Array.isArray(json.stop)).toBe(true);
    expect((json.stop as string[]).length).toBeGreaterThan(0);
    expect(Array.isArray(chat.stop)).toBe(true);
  });

  it('enables Gemma plain-content parsing', () => {
    const p = mergeLocalLlmCompletionParams('local/gemma-2-2b-it-q4_k_m', 'json');
    expect(p.force_pure_content).toBe(true);
  });

  it('disables Qwen reasoning channel for structured output', () => {
    const p = mergeLocalLlmCompletionParams('local/qwen3-1.7b-q4_k_m', 'json');
    expect(p.reasoning_format).toBe('none');
  });
});
