import {
  enrichInboxAskEvidence,
  resolveInboxEvidenceRecordId,
} from '../enrichInboxAskEvidence';

const notes = [
  { recordId: 'rec-1', title: 'Budget sync' },
  { recordId: 'rec-2', title: 'Launch prep' },
];

describe('enrichInboxAskEvidence', () => {
  it('adds recordId to corpus_note evidence matched by label title', () => {
    const evidence = [
      {
        quote: 'Ship by Friday',
        source: 'corpus_note' as const,
        label: 'Launch prep',
      },
    ];

    expect(enrichInboxAskEvidence(evidence, notes)).toEqual([
      {
        quote: 'Ship by Friday',
        source: 'corpus_note',
        label: 'Launch prep',
        recordId: 'rec-2',
      },
    ]);
  });

  it('leaves non-corpus evidence and items with recordId unchanged', () => {
    const evidence = [
      { quote: 'from transcript', source: 'transcript' as const },
      {
        quote: 'already linked',
        source: 'corpus_note' as const,
        recordId: 'rec-9',
        label: 'Budget sync',
      },
    ];

    expect(enrichInboxAskEvidence(evidence, notes)).toEqual(evidence);
  });

  it('returns undefined for empty evidence', () => {
    expect(enrichInboxAskEvidence(undefined, notes)).toBeUndefined();
  });
});

describe('resolveInboxEvidenceRecordId', () => {
  it('resolves corpus_note by label when recordId is missing', () => {
    expect(
      resolveInboxEvidenceRecordId(
        { quote: 'x', source: 'corpus_note', label: 'Budget sync' },
        notes,
      ),
    ).toBe('rec-1');
  });

  it('returns undefined for non-corpus sources', () => {
    expect(resolveInboxEvidenceRecordId({ quote: 'x', source: 'summary' }, notes)).toBeUndefined();
  });
});
