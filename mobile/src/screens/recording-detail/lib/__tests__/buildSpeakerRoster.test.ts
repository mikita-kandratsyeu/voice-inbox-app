import { buildSpeakerRoster, shouldShowInlineSpeakerLabel } from '../buildSpeakerRoster';
import { parseMeetingDialogue } from '../parseMeetingDialogue';

describe('buildSpeakerRoster', () => {
  it('collapses roster chips that share a display name after merge', () => {
    const utterances = parseMeetingDialogue(
      'Участник 1: Hi\n\nУчастник 2: Hello\n\nУчастник 3: Hey',
    );
    const roster = buildSpeakerRoster(utterances, {
      'участник 1': 'Участник 4',
      'участник 2': 'Участник 4',
      'участник 3': 'Участник 4',
    });

    expect(roster).toHaveLength(1);
    expect(roster[0]?.displayLabel).toBe('Участник 4');
    expect(roster[0]?.originalLabels).toEqual(['Участник 1', 'Участник 2', 'Участник 3']);
  });

  it('hides repeated inline labels when merged speakers share a display name', () => {
    const utterances = parseMeetingDialogue(
      'Участник 1: First\n\nУчастник 2: Second\n\nУчастник 1: Third',
    );
    const labels = { 'участник 1': 'Anna', 'участник 2': 'Anna' };

    expect(shouldShowInlineSpeakerLabel(utterances, 0, labels)).toBe(true);
    expect(shouldShowInlineSpeakerLabel(utterances, 1, labels)).toBe(false);
    expect(shouldShowInlineSpeakerLabel(utterances, 2, labels)).toBe(false);
  });
});
