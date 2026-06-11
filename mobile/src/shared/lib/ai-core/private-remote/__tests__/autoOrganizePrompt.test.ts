import { buildAutoOrganizeSystemPrompt } from '../autoOrganizePrompt';
import {
  parseAutoOrganizeArchiveResult,
  parseAutoOrganizeConsolidateResult,
  parseAutoOrganizeResult,
} from '../parseAutoOrganizeResult';

describe('buildAutoOrganizeSystemPrompt', () => {
  it('includes template block for full organize', () => {
    const prompt = buildAutoOrganizeSystemPrompt('full', 'work_personal_ideas');
    expect(prompt).toContain('Organization template');
    expect(prompt).toContain('Work / Personal / Ideas');
  });

  it('uses assign_existing constraints', () => {
    const prompt = buildAutoOrganizeSystemPrompt('assign_existing', 'general');
    expect(prompt).toContain('folders" must be an empty array');
  });

  it('uses consolidate schema', () => {
    const prompt = buildAutoOrganizeSystemPrompt('consolidate_folders', 'general');
    expect(prompt).toContain('"merges"');
    expect(prompt).toContain('"deleteEmptyFolderNames"');
  });

  it('uses archive schema and avoids folder output', () => {
    const prompt = buildAutoOrganizeSystemPrompt('suggest_archive', 'general');
    expect(prompt).toContain('"archiveSuggestions"');
    expect(prompt).toContain('Do NOT output "folders" or "assignments"');
    expect(prompt).toContain('isPinned');
    expect(prompt).toContain('openTaskCount');
    expect(prompt).toContain('NEVER suggest archive');
  });
});

describe('parseAutoOrganizeResult modes', () => {
  it('parses assign_existing with inbox sentinel', () => {
    const parsed = parseAutoOrganizeResult(
      JSON.stringify({
        folders: [],
        assignments: [
          { recordId: 'a', folderName: '__inbox__' },
          { recordId: 'b', folderName: 'Work' },
        ],
      }),
      'assign_existing',
    );
    expect(parsed.folders).toEqual([]);
    expect(parsed.assignments[0]?.folderName).toBe('__inbox__');
  });

  it('parses consolidate result', () => {
    const parsed = parseAutoOrganizeConsolidateResult(
      JSON.stringify({
        merges: [
          {
            sourceFolderNames: ['A', 'B'],
            targetFolderName: 'A',
            targetIcon: 'briefcase',
            targetColor: '#ff6b6b',
          },
        ],
        deleteEmptyFolderNames: ['Empty'],
      }),
    );
    expect(parsed.merges).toHaveLength(1);
    expect(parsed.deleteEmptyFolderNames).toEqual(['Empty']);
  });

  it('parses archive suggestions', () => {
    const parsed = parseAutoOrganizeArchiveResult(
      JSON.stringify({
        archiveSuggestions: [{ recordId: 'n1', reason: 'Completed task' }],
      }),
    );
    expect(parsed.archiveSuggestions).toEqual([{ recordId: 'n1', reason: 'Completed task' }]);
  });
});
