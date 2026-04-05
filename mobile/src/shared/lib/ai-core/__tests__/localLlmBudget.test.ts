import { DEFAULT_LOCAL_AI_MODEL_ID } from '@/entities/settings/model/constants';

import {
  estimateLocalLlmPromptTokens,
  LOCAL_LLM_PROMPT_OVERHEAD_TOKENS,
  localPromptFitsLlmContext,
} from '../localLlmBudget';
import { getLocalLlmNCtx } from '../localLlmModelProfiles';

describe('localLlmBudget', () => {
  it('estimateLocalLlmPromptTokens is sublinear for mostly Latin text', () => {
    const s = 'a'.repeat(9000);
    expect(estimateLocalLlmPromptTokens(s)).toBe(3000);
  });

  it('estimateLocalLlmPromptTokens is stricter for mostly non-ASCII', () => {
    const s = 'ы'.repeat(10_000);
    expect(estimateLocalLlmPromptTokens(s)).toBeGreaterThan(5000);
  });

  it('localPromptFitsLlmContext rejects clearly oversized prompts', () => {
    const huge = 'a'.repeat(100_000);
    expect(localPromptFitsLlmContext(huge, 1024, DEFAULT_LOCAL_AI_MODEL_ID)).toBe(false);
  });

  it('localPromptFitsLlmContext toggles at Latin length boundary for ask maxTokens', () => {
    const nCtx = getLocalLlmNCtx(DEFAULT_LOCAL_AI_MODEL_ID);
    const maxLatinChars = (nCtx - 450 - LOCAL_LLM_PROMPT_OVERHEAD_TOKENS) * 3;
    expect(
      localPromptFitsLlmContext('e'.repeat(maxLatinChars), 450, DEFAULT_LOCAL_AI_MODEL_ID),
    ).toBe(true);
    expect(
      localPromptFitsLlmContext('e'.repeat(maxLatinChars + 1), 450, DEFAULT_LOCAL_AI_MODEL_ID),
    ).toBe(false);
  });
});
