import {
  buildNormalizedTextSet,
  collectExistingTaskTextsForAiPrompt,
  filterAiTaskItemsByNormalizedSet,
  filterNextStepsByNormalizedTaskSet,
  normalizedManualTaskTextSet,
  normalizeTaskTextForDedupe,
} from '../taskTextDedupe';
import type { TaskItem } from '../types';

function task(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 'task-1',
    text: 'Follow up',
    isDone: false,
    ...overrides,
  };
}

describe('taskTextDedupe', () => {
  describe('normalizeTaskTextForDedupe', () => {
    it('trims and lowercases', () => {
      expect(normalizeTaskTextForDedupe('  Ship Fix  ')).toBe('ship fix');
    });
  });

  describe('buildNormalizedTextSet', () => {
    it('skips empty strings', () => {
      expect(buildNormalizedTextSet(['  ', 'Hello'])).toEqual(new Set(['hello']));
    });
  });

  describe('collectExistingTaskTextsForAiPrompt', () => {
    it('dedupes, clips long text, and caps count', () => {
      const tasks = [
        task({ text: 'Alpha' }),
        task({ id: 't2', text: 'alpha' }),
        task({ id: 't3', text: 'Beta' }),
      ];
      expect(collectExistingTaskTextsForAiPrompt(tasks)).toEqual(['Alpha', 'Beta']);
    });

    it('returns empty for missing tasks', () => {
      expect(collectExistingTaskTextsForAiPrompt(undefined)).toEqual([]);
    });
  });

  describe('normalizedManualTaskTextSet', () => {
    it('includes only manual tasks', () => {
      const set = normalizedManualTaskTextSet([
        task({ id: 'rec-manual-1', source: 'manual', text: 'Manual task' }),
        task({ id: 'ai-1', source: 'ai', text: 'AI task' }),
      ]);
      expect(set).toEqual(new Set(['manual task']));
    });
  });

  describe('filterAiTaskItemsByNormalizedSet', () => {
    it('removes AI tasks matching blocklist', () => {
      const blocklist = buildNormalizedTextSet(['existing']);
      const filtered = filterAiTaskItemsByNormalizedSet(
        [task({ text: 'Existing' }), task({ id: 't2', text: 'New' })],
        blocklist,
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.text).toBe('New');
    });
  });

  describe('filterNextStepsByNormalizedTaskSet', () => {
    it('removes next steps that duplicate task text', () => {
      const taskTexts = buildNormalizedTextSet(['call client']);
      const filtered = filterNextStepsByNormalizedTaskSet(['Call client', 'Send recap'], taskTexts);
      expect(filtered).toEqual(['Send recap']);
    });
  });
});
