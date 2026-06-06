import {
  beginTranscriptionJob,
  endTranscriptionJobIfCurrent,
  hasActiveTranscriptionJob,
  hasAnyActiveTranscriptionJob,
  invalidateTranscriptionJob,
  isActiveTranscriptionJob,
} from '../transcriptionJobRegistry';

describe('transcriptionJobRegistry', () => {
  afterEach(() => {
    invalidateTranscriptionJob('record-a');
    invalidateTranscriptionJob('record-b');
  });

  it('tracks only the latest generation for a record', () => {
    const first = beginTranscriptionJob('record-a');
    const second = beginTranscriptionJob('record-a');

    expect(isActiveTranscriptionJob('record-a', first)).toBe(false);
    expect(isActiveTranscriptionJob('record-a', second)).toBe(true);
    expect(hasActiveTranscriptionJob('record-a')).toBe(true);
    expect(hasAnyActiveTranscriptionJob()).toBe(true);
  });

  it('does not end a newer job with an older generation', () => {
    const first = beginTranscriptionJob('record-a');
    const second = beginTranscriptionJob('record-a');

    endTranscriptionJobIfCurrent('record-a', first);
    expect(isActiveTranscriptionJob('record-a', second)).toBe(true);

    endTranscriptionJobIfCurrent('record-a', second);
    expect(hasActiveTranscriptionJob('record-a')).toBe(false);
  });
});
