import { AI_MODEL_GEMINI_3_1_FLASH_LITE } from '../config/constants';
import {
  aiModelClientResponseFields,
  aiModelLedgerMetadata,
  sanitizeAiModelFieldsForClient,
} from './ai-model-display';

describe('aiModelClientResponseFields', () => {
  it('returns only modelMode for auto routing', () => {
    expect(aiModelClientResponseFields(AI_MODEL_GEMINI_3_1_FLASH_LITE, 'auto')).toEqual({
      modelMode: 'auto',
    });
  });

  it('returns resolved model fields for manual routing', () => {
    expect(aiModelClientResponseFields(AI_MODEL_GEMINI_3_1_FLASH_LITE, 'manual')).toEqual({
      model: AI_MODEL_GEMINI_3_1_FLASH_LITE,
      modelLabel: 'Gemini 3.1 Flash Lite',
      modelMode: 'manual',
    });
  });
});

describe('aiModelLedgerMetadata', () => {
  it('keeps resolved model in ledger metadata for auto routing', () => {
    expect(aiModelLedgerMetadata(AI_MODEL_GEMINI_3_1_FLASH_LITE, 'auto')).toEqual({
      model: AI_MODEL_GEMINI_3_1_FLASH_LITE,
      modelLabel: 'Gemini 3.1 Flash Lite',
      modelMode: 'auto',
    });
  });
});

describe('sanitizeAiModelFieldsForClient', () => {
  it('strips model fields when modelMode is auto', () => {
    expect(
      sanitizeAiModelFieldsForClient({
        id: 'job-1',
        status: 'done',
        model: AI_MODEL_GEMINI_3_1_FLASH_LITE,
        modelLabel: 'Gemini 3.1 Flash Lite',
        modelMode: 'auto',
        summary: 'ok',
      } as {
        model?: string;
        modelLabel?: string;
        modelMode?: 'auto' | 'manual';
        id: string;
        status: string;
        summary: string;
      }),
    ).toEqual({
      id: 'job-1',
      status: 'done',
      modelMode: 'auto',
      summary: 'ok',
    });
  });
});
