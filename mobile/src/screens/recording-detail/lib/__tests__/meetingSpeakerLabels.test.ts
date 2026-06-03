import {
  analyzeMeetingDialogueHeuristics,
  applySpeakerLabelsToUtterances,
  displaySpeakerLabel,
  mergeSpeakerRename,
  normalizeSpeakerLabelKey,
  pruneSpeakerLabelsForDialogue,
} from '../meetingSpeakerLabels';
import { parseMeetingDialogue } from '../parseMeetingDialogue';

describe('meetingSpeakerLabels', () => {
  it('normalizes label keys case-insensitively', () => {
    expect(normalizeSpeakerLabelKey('Speaker 1')).toBe('speaker 1');
    expect(normalizeSpeakerLabelKey('  Участник 2  ')).toBe('участник 2');
  });

  it('merges and clears renames', () => {
    const next = mergeSpeakerRename(undefined, 'Speaker 1', 'Anna');
    expect(next).toEqual({ 'speaker 1': 'Anna' });
    expect(displaySpeakerLabel('Speaker 1', next)).toBe('Anna');
    expect(mergeSpeakerRename(next, 'Speaker 1', 'Speaker 1')).toBeUndefined();
  });

  it('applies renames to utterances for export', () => {
    const raw = 'Speaker 1: Hello\n\nSpeaker 2: Hi';
    const utterances = applySpeakerLabelsToUtterances(parseMeetingDialogue(raw), {
      'speaker 2': 'Client',
    });
    expect(utterances[0].speakerLabel).toBe('Speaker 1');
    expect(utterances[1].speakerLabel).toBe('Client');
  });

  it('prunes renames when speaker keys disappear from new dialogue', () => {
    const labels = { 'speaker 1': 'Anna', 'speaker 2': 'Client', 'speaker 3': 'Guest' };
    const md = 'Speaker 1: Hi\n\nSpeaker 2: Hello';
    expect(pruneSpeakerLabelsForDialogue(labels, md)).toEqual({
      'speaker 1': 'Anna',
      'speaker 2': 'Client',
    });
  });

  it('detects single-speaker and no-label heuristics', () => {
    const single = parseMeetingDialogue('Speaker 1: Only one');
    expect(analyzeMeetingDialogueHeuristics(single).showSingleSpeakerHint).toBe(true);

    const none = parseMeetingDialogue('Just a wall of text without labels.');
    expect(analyzeMeetingDialogueHeuristics(none).showNoSpeakerLabelsHint).toBe(true);
  });

  it('parses Собеседник speaker labels', () => {
    const utterances = parseMeetingDialogue('Собеседник 1: Привет\n\nСобеседник 2: До связи');
    expect(utterances).toHaveLength(2);
    expect(utterances[0]?.speakerLabel).toBe('Собеседник 1');
    expect(analyzeMeetingDialogueHeuristics(utterances).showNoSpeakerLabelsHint).toBe(false);
  });

  it('parses bold speaker blocks from model output', () => {
    const utterances = parseMeetingDialogue(
      '**Собеседник 1**\nПервая реплика\n\n**Собеседник 2**\nВторая реплика',
    );
    expect(utterances).toHaveLength(2);
    expect(utterances[0]?.body).toBe('Первая реплика');
    expect(utterances[1]?.speakerLabel).toBe('Собеседник 2');
  });
});
