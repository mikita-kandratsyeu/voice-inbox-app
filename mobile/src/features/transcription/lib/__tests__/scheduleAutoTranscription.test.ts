import { tryScheduleAutoTranscription } from '../scheduleAutoTranscription';

jest.mock('../../model/transcriptionConcurrency', () => ({
  isTranscriptionBlockedForRecord: jest.fn(() => false),
}));

describe('tryScheduleAutoTranscription', () => {
  it('skips short recordings', () => {
    const start = jest.fn();
    const result = tryScheduleAutoTranscription({ id: 'r1', durationMs: 500 }, [], start, {
      id: 'r1',
      durationMs: 500,
    } as never);

    expect(result).toBe('too_short');
    expect(start).not.toHaveBeenCalled();
  });

  it('starts eligible recordings', () => {
    const start = jest.fn();
    const record = { id: 'r1', durationMs: 5_000 } as never;
    const result = tryScheduleAutoTranscription(record, [], start, record);

    expect(result).toBe('started');
    expect(start).toHaveBeenCalledWith(record);
  });
});
