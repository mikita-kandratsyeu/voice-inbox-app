import {
  assertAutoOrganizeComplete,
  isAutoOrganizeParseFailure,
  parseAutoOrganizeResult,
} from '../parseAutoOrganizeResult';

const validPayload = {
  folders: [{ name: 'Work', icon: 'briefcase', color: '#3b82f6' }],
  assignments: [{ recordId: 'rec-1', folderName: 'Work' }],
};

describe('parseAutoOrganizeResult', () => {
  it('parses clean JSON', () => {
    const result = parseAutoOrganizeResult(JSON.stringify(validPayload));
    expect(result.folders).toHaveLength(1);
    expect(result.assignments).toEqual([{ recordId: 'rec-1', folderName: 'Work' }]);
  });

  it('strips markdown code fences', () => {
    const wrapped = '```json\n' + JSON.stringify(validPayload) + '\n```';
    const result = parseAutoOrganizeResult(wrapped);
    expect(result.assignments[0]?.recordId).toBe('rec-1');
  });

  it('dedupes folders case-insensitively and canonicalizes assignment names', () => {
    const payload = {
      folders: [
        { name: 'Work', icon: 'briefcase', color: '#3b82f6' },
        { name: 'work', icon: 'home', color: '#ff0000' },
      ],
      assignments: [
        { recordId: 'rec-1', folderName: 'WORK' },
        { recordId: 'rec-2', folderName: 'Work' },
      ],
    };

    const result = parseAutoOrganizeResult(JSON.stringify(payload));
    expect(result.folders).toHaveLength(1);
    expect(result.folders[0]?.name).toBe('Work');
    expect(result.assignments.every((a) => a.folderName === 'Work')).toBe(true);
  });

  it('falls back to default icon for unknown icons', () => {
    const payload = {
      folders: [{ name: 'Ideas', icon: 'unknown-icon', color: '#10b981' }],
      assignments: [{ recordId: 'rec-1', folderName: 'Ideas' }],
    };
    const result = parseAutoOrganizeResult(JSON.stringify(payload));
    expect(result.folders[0]?.icon).toBe('briefcase');
  });

  it('throws on malformed JSON', () => {
    expect(() => parseAutoOrganizeResult('{ not json')).toThrow('malformed JSON');
  });

  it('throws on duplicate recordId', () => {
    const payload = {
      folders: [{ name: 'Work', icon: 'briefcase', color: '#3b82f6' }],
      assignments: [
        { recordId: 'rec-1', folderName: 'Work' },
        { recordId: 'rec-1', folderName: 'Work' },
      ],
    };
    expect(() => parseAutoOrganizeResult(JSON.stringify(payload))).toThrow('duplicate recordId');
  });

  it('throws when assignment references unknown folder', () => {
    const payload = {
      folders: [{ name: 'Work', icon: 'briefcase', color: '#3b82f6' }],
      assignments: [{ recordId: 'rec-1', folderName: 'Personal' }],
    };
    expect(() => parseAutoOrganizeResult(JSON.stringify(payload))).toThrow('unknown folder');
  });
});

describe('assertAutoOrganizeComplete', () => {
  it('passes when all expected ids are assigned', () => {
    const result = parseAutoOrganizeResult(JSON.stringify(validPayload));
    expect(() => assertAutoOrganizeComplete(result, ['rec-1'])).not.toThrow();
  });

  it('throws on count or id mismatch', () => {
    const result = parseAutoOrganizeResult(JSON.stringify(validPayload));
    expect(() => assertAutoOrganizeComplete(result, ['rec-1', 'rec-2'])).toThrow(
      'assignment count mismatch',
    );
    expect(() => assertAutoOrganizeComplete(result, ['rec-2'])).toThrow('unexpected recordId');
  });
});

describe('isAutoOrganizeParseFailure', () => {
  it('detects parse errors', () => {
    expect(isAutoOrganizeParseFailure(new Error('Invalid AI response: malformed JSON'))).toBe(true);
    expect(isAutoOrganizeParseFailure(new Error('network'))).toBe(false);
    expect(isAutoOrganizeParseFailure('oops')).toBe(false);
  });
});
