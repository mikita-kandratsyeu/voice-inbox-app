import {
  calculatePollDeadlineMs,
  getAiJobMaxDurationSeconds,
  getJobLockTtlSeconds,
  parseAiJobEnvelope,
  parseQStashFailureCallbackEnvelope,
  resolveAiJobPublishPlan,
  VERCEL_WORKER_MAX_DURATION_SECONDS,
} from '@voice-inbox/ai-job-core';

describe('@voice-inbox/ai-job-core duration', () => {
  it('defaults to Vercel budget without Cloud Run URL', () => {
    expect(getAiJobMaxDurationSeconds({})).toBe(VERCEL_WORKER_MAX_DURATION_SECONDS);
    expect(getJobLockTtlSeconds({})).toBe(VERCEL_WORKER_MAX_DURATION_SECONDS + 30);
  });

  it('uses 900s when Cloud Run worker URL is configured', () => {
    expect(getAiJobMaxDurationSeconds({ aiJobWorkerUrl: 'https://worker.run.app/worker' })).toBe(900);
    expect(getJobLockTtlSeconds({ aiJobWorkerUrl: 'https://worker.run.app/worker' })).toBe(930);
  });

  it('doubles poll deadline for summary jobs', () => {
    const started = 1_700_000_000_000;
    const env = { aiJobWorkerUrl: 'https://worker.run.app/worker' };
    expect(calculatePollDeadlineMs(started, 'summary', env)).toBe(started + 900 * 2 * 1_000);
    expect(calculatePollDeadlineMs(started, 'ask', env)).toBe(started + 900 * 1_000);
  });
});

describe('@voice-inbox/ai-job-core publish plan', () => {
  it('uses Vercel-only fallback when primary URL is unset', () => {
    const plan = resolveAiJobPublishPlan({
      baseUrlOrFallback: 'https://app.example.com',
    });
    expect(plan.primary).toBeNull();
    expect(plan.fallback.url).toBe('https://app.example.com/api/internal/ai/worker');
    expect(plan.fallback.timeoutSeconds).toBe(300);
  });

  it('targets Cloud Run with failureCallback to Vercel', () => {
    const plan = resolveAiJobPublishPlan({
      aiJobWorkerUrl: 'https://ai-worker-prod.run.app/worker',
      baseUrlOrFallback: 'https://app.example.com',
    });
    expect(plan.primary?.timeoutSeconds).toBe(900);
    expect(plan.primary?.failureCallback).toBe('https://app.example.com/api/internal/ai/worker');
  });

  it('reads Cloud Run URL from process.env', () => {
    const original = process.env;
    process.env = {
      ...original,
      AI_JOB_WORKER_URL: 'https://ai-worker.run.app/worker/',
      NEXT_PUBLIC_BASE_URL: 'https://voice.example.com',
    };
    try {
      const plan = resolveAiJobPublishPlan();
      expect(plan.primary?.url).toBe('https://ai-worker.run.app/worker');
      expect(plan.primary?.failureCallback).toContain('/api/internal/ai/worker');
    } finally {
      process.env = original;
    }
  });
});

describe('@voice-inbox/ai-job-core envelope', () => {
  it('parses failure callback sourceBody', () => {
    const envelope = {
      jobId: 'msg_2',
      operation: 'meeting_dialogue',
      deviceId: 'dev_2',
      messageTtlSeconds: 1800,
    };
    const sourceBody = Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');
    expect(parseQStashFailureCallbackEnvelope({ sourceBody, status: 500 })).toEqual(envelope);
  });

  it('parses direct envelopes', () => {
    expect(
      parseAiJobEnvelope({
        jobId: 'x',
        operation: 'inbox_ask',
        deviceId: 'd',
        messageTtlSeconds: 300,
      })?.operation,
    ).toBe('inbox_ask');
  });
});
