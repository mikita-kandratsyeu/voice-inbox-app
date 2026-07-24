import {
  DEFAULT_RECORDING_MARK_KIND,
  normalizeRecordingMarkKind,
  RECORDING_MARK_LABEL_MAX,
  sanitizeRecordingMark,
} from '../normalizeRecordingMark';

describe('normalizeRecordingMarkKind', () => {
  it('returns valid kinds unchanged', () => {
    expect(normalizeRecordingMarkKind('decision')).toBe('decision');
  });

  it('falls back to moment for unknown kinds', () => {
    expect(normalizeRecordingMarkKind('invalid')).toBe(DEFAULT_RECORDING_MARK_KIND);
    expect(normalizeRecordingMarkKind(null)).toBe(DEFAULT_RECORDING_MARK_KIND);
  });
});

describe('sanitizeRecordingMark', () => {
  it('returns null for non-object input', () => {
    expect(sanitizeRecordingMark(null, 0)).toBeNull();
    expect(sanitizeRecordingMark('mark', 0)).toBeNull();
  });

  it('normalizes offset, kind, and label', () => {
    const mark = sanitizeRecordingMark(
      {
        id: 'mark-1',
        offsetMs: 1234.6,
        kind: 'quote',
        label: 'Important quote',
      },
      0,
    );

    expect(mark).toEqual({
      id: 'mark-1',
      offsetMs: 1235,
      kind: 'quote',
      label: 'Important quote',
    });
  });

  it('clamps negative offset to zero', () => {
    const mark = sanitizeRecordingMark({ id: 'm1', offsetMs: -50, kind: 'task' }, 0);
    expect(mark?.offsetMs).toBe(0);
  });

  it('truncates long labels', () => {
    const label = 'x'.repeat(RECORDING_MARK_LABEL_MAX + 50);
    const mark = sanitizeRecordingMark({ id: 'm1', offsetMs: 0, label }, 0);
    expect(mark?.label).toHaveLength(RECORDING_MARK_LABEL_MAX);
  });

  it('generates legacy id when missing', () => {
    const mark = sanitizeRecordingMark({ offsetMs: 500, kind: 'moment' }, 2);
    expect(mark?.id).toBe('rm_legacy_500_2');
  });

  it('uses fallback id when provided', () => {
    const mark = sanitizeRecordingMark({ offsetMs: 0 }, 0, 'fallback-id');
    expect(mark?.id).toBe('fallback-id');
  });
});
