import type { LocalAiModelId } from '@/entities/settings';
import { DEFAULT_LOCAL_AI_MODEL_ID } from '@/entities/settings/model/constants';

import {
  DEFAULT_LOCAL_LLM_N_CTX,
  getLocalLlmAskTemperature,
  getLocalLlmContextParams,
  getLocalLlmNCtx,
  getLocalLlmSummaryTemperature,
  mergeLocalLlmCompletionParams,
} from '../localLlmModelProfiles';

const ALL_LOCAL_IDS: LocalAiModelId[] = [
  DEFAULT_LOCAL_AI_MODEL_ID,
  'local/qwen3-1.7b-q4_k_m',
  'local/gemma-2-2b-it-q4_k_m',
];

describe('localLlmModelProfiles', () => {
  it('uses single parallel slot and GPU-optimised batches', () => {
    expect(getLocalLlmContextParams()).toMatchObject({
      n_parallel: 1,
      n_batch: 1024,
      n_ubatch: 512,
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

  it.each(ALL_LOCAL_IDS)('applies min_p tail-trim for json intent on %s', (id) => {
    const p = mergeLocalLlmCompletionParams(id, 'json');
    expect(typeof p.min_p).toBe('number');
    expect(p.min_p).toBeGreaterThan(0);
  });

  it('DEFAULT_LOCAL_LLM_N_CTX is 10 240 (moderate on-device window)', () => {
    expect(DEFAULT_LOCAL_LLM_N_CTX).toBe(10_240);
  });

  it('getLocalLlmNCtx returns explicit nCtx for all models', () => {
    expect(getLocalLlmNCtx('local/qwen3-1.7b-q4_k_m')).toBe(10_240);
    expect(getLocalLlmNCtx('local/llama-3.2-1b-q4_k_m')).toBe(10_240);
    expect(getLocalLlmNCtx('local/gemma-2-2b-it-q4_k_m')).toBe(14_336);
  });

  it('applies Gemma-specific generation temperatures when set', () => {
    expect(getLocalLlmSummaryTemperature('local/gemma-2-2b-it-q4_k_m', 0.2)).toBe(0.18);
    expect(getLocalLlmAskTemperature('local/gemma-2-2b-it-q4_k_m', 0.25)).toBe(0.22);
    expect(getLocalLlmSummaryTemperature('local/llama-3.2-1b-q4_k_m', 0.2)).toBe(0.2);
  });
});
