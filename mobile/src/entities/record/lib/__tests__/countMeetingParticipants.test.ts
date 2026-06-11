import { countMeetingParticipants } from '../countMeetingParticipants';

describe('countMeetingParticipants', () => {
  it('returns 0 when dialogue is empty', () => {
    expect(countMeetingParticipants(undefined)).toBe(0);
    expect(countMeetingParticipants('   ')).toBe(0);
  });

  it('counts unique speakers from meeting dialogue', () => {
    const dialogue = 'Speaker 1: Hello\n\nSpeaker 2: Hi there\n\nSpeaker 1: Bye';
    expect(countMeetingParticipants(dialogue)).toBe(2);
  });

  it('merges renamed speakers via meetingSpeakerLabels', () => {
    const dialogue = 'Speaker 1: Hello\n\nSpeaker 2: Hi';
    expect(
      countMeetingParticipants(dialogue, {
        'speaker 1': 'Alex',
        'speaker 2': 'Alex',
      }),
    ).toBe(1);
  });
});
