import {
  buildAsyncJobPollSchedule,
  computePollExpiresAtMs,
  expectsAsyncMeetingDialoguePass,
  workerPassesForPollDeadline,
} from './ai-poll-deadline';

describe('ai-poll-deadline', () => {
  const startedAtMs = Date.parse('2026-07-01T12:00:00.000Z');

  it('detects async meeting dialogue for long meeting transcripts', () => {
    expect(
      expectsAsyncMeetingDialoguePass({
        pseudoDiarizationEligible: true,
        transcriptChars: 10_001,
      }),
    ).toBe(true);
    expect(
      expectsAsyncMeetingDialoguePass({
        pseudoDiarizationEligible: true,
        transcriptChars: 10_000,
      }),
    ).toBe(false);
    expect(
      expectsAsyncMeetingDialoguePass({
        pseudoDiarizationEligible: false,
        transcriptChars: 20_000,
      }),
    ).toBe(false);
  });

  it('allocates one worker pass by default and two for async meeting dialogue', () => {
    expect(workerPassesForPollDeadline({})).toBe(1);
    expect(workerPassesForPollDeadline({ expectAsyncMeetingDialogue: true })).toBe(2);
    expect(workerPassesForPollDeadline({ workerPasses: 3 })).toBe(3);
  });

  it('builds poll schedule from worker pass budget', () => {
    const schedule = buildAsyncJobPollSchedule({
      startedAtMs,
      expectAsyncMeetingDialogue: true,
    });

    expect(schedule.startedAtMs).toBe(startedAtMs);
    expect(schedule.pollExpiresAtMs).toBe(
      computePollExpiresAtMs({ startedAtMs, expectAsyncMeetingDialogue: true }),
    );
    expect(schedule.pollExpiresAt).toBe('2026-07-01T12:10:00.000Z');
  });
});
