import {
  analyzeMeetingDialogueHeuristics,
  applySpeakerLabelsToUtterances,
  displaySpeakerLabel,
  mergeSpeakerRename,
  normalizeSpeakerLabelKey,
  pruneSpeakerLabelsForDialogue,
  renameSpeakerGroup,
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

  it('renames speaker groups in one pass', () => {
    const renamed = renameSpeakerGroup(undefined, ['Speaker 1', 'Speaker 2'], 'Anna');
    expect(renamed).toEqual({ 'speaker 1': 'Anna', 'speaker 2': 'Anna' });
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
    const noneHeuristics = analyzeMeetingDialogueHeuristics(none);
    expect(noneHeuristics.showNoSpeakerLabelsHint).toBe(true);
    expect(noneHeuristics.showSingleSpeakerHint).toBe(false);
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

  it('parses markdown list speaker turns from model output', () => {
    const utterances = parseMeetingDialogue(
      '- **Speaker 1:** First reply\n' +
        '- **Speaker 2:** Second reply\n' +
        '1. [Участник №3]: Третья реплика',
    );

    expect(utterances).toHaveLength(3);
    expect(utterances.map((u) => u.speakerLabel)).toEqual([
      'Speaker 1',
      'Speaker 2',
      'Участник №3',
    ]);
    expect(utterances[2]?.body).toBe('Третья реплика');
  });

  it('parses known speaker labels separated with dashes', () => {
    const utterances = parseMeetingDialogue(
      'Speaker #1 - Planning update\nParticipant 2 — I can take the next step\nУчастница 3 – Проверю завтра',
    );

    expect(utterances).toHaveLength(3);
    expect(utterances.map((u) => u.speakerLabel)).toEqual([
      'Speaker #1',
      'Participant 2',
      'Участница 3',
    ]);
    expect(utterances[1]?.body).toBe('I can take the next step');
  });

  it('parses simple markdown table speaker turns', () => {
    const utterances = parseMeetingDialogue(
      '| Speaker | Text |\n| --- | --- |\n| Speaker 1 | Hello |\n| Speaker 2 | Hi |',
    );

    expect(utterances).toHaveLength(2);
    expect(utterances[0]?.speakerLabel).toBe('Speaker 1');
    expect(utterances[0]?.body).toBe('Hello');
    expect(utterances[1]?.speakerLabel).toBe('Speaker 2');
  });

  it('parses transcript names instead of neutral participant labels', () => {
    const raw =
      'Рассказчик: В мире, где форматы субтитров несовместимы.\n\n' +
      'Алекс: Почему мои субтитры не могут просто работать везде?\n\n' +
      'Джордан: Потому что технологическая индустрия решила, что нам нужно 47 форматов.\n\n' +
      'Босс: Мне нужны субтитры в формате VTT к полудню!\n\n' +
      'Алекс: [внутренний крик]';
    const utterances = parseMeetingDialogue(raw);

    expect(utterances).toHaveLength(5);
    expect(utterances.map((u) => u.speakerLabel)).toEqual([
      'Рассказчик',
      'Алекс',
      'Джордан',
      'Босс',
      'Алекс',
    ]);
    expect(utterances[4]?.body).toBe('[внутренний крик]');
    expect(analyzeMeetingDialogueHeuristics(utterances).showNoSpeakerLabelsHint).toBe(false);
  });

  it('does not treat URL schemes or clock times as speaker labels', () => {
    const utterances = parseMeetingDialogue(
      'https: //example.com\n\n12:30 standup\n\nSpeaker 1: Real turn',
    );
    expect(utterances.some((u) => u.speakerLabel === 'https' || u.speakerLabel === 'ttps')).toBe(
      false,
    );
    expect(utterances.at(-1)?.speakerLabel).toBe('Speaker 1');
    expect(utterances.at(-1)?.body).toBe('Real turn');
  });
});
