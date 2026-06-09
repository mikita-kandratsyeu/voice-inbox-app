import {
  AI_MODEL_DEEPSEEK_V4_FLASH,
  AI_MODEL_GEMINI_3_1_FLASH_LITE,
  AI_MODEL_GPT_5_4_NANO,
} from '../config/constants';
import { estimateSummaryTasksRoutingChars, resolveAutoAiModel } from './ai-model-router';

describe('resolveAutoAiModel', () => {
  it('routes summary tasks by transcript size', () => {
    expect(resolveAutoAiModel({ taskType: 'summary_tasks', routingChars: 500 })).toBe(
      AI_MODEL_GPT_5_4_NANO,
    );
    expect(resolveAutoAiModel({ taskType: 'summary_tasks', routingChars: 9_000 })).toBe(
      AI_MODEL_DEEPSEEK_V4_FLASH,
    );
    expect(resolveAutoAiModel({ taskType: 'summary_tasks', routingChars: 20_000 })).toBe(
      AI_MODEL_GEMINI_3_1_FLASH_LITE,
    );
  });
});

describe('estimateSummaryTasksRoutingChars', () => {
  it('includes prompt append blocks', () => {
    const chars = estimateSummaryTasksRoutingChars('abc', {
      existingTaskTexts: ['Follow up with client'],
      taskExtractionHint: 'Focus on deadlines',
      recordingMarks: [{ offsetMs: 1000, kind: 'important', label: 'Approved' }],
    });

    expect(chars).toBeGreaterThan(3);
  });
});
