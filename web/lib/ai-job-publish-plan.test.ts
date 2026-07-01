import { parseAiJobEnvelope } from '@voice-inbox/ai-job-core';

import { resolveAiJobPublishPlan } from '@/lib/ai-job-publish-plan';

describe('resolveAiJobPublishPlan (web)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.AI_JOB_WORKER_URL;
    delete process.env.AI_JOB_WORKER_FALLBACK_URL;
    delete process.env.AI_JOB_MAX_DURATION_SECONDS;
    process.env.NEXT_PUBLIC_BASE_URL = 'https://voice.example.com';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reads Cloud Run URL from env', () => {
    process.env.AI_JOB_WORKER_URL = 'https://ai-worker.run.app/worker/';
    const plan = resolveAiJobPublishPlan();
    expect(plan.primary?.url).toBe('https://ai-worker.run.app/worker');
    expect(plan.primary?.failureCallback).toContain('/api/internal/ai/worker');
  });
});

describe('parseAiJobEnvelope integration', () => {
  it('re-exports core parser', () => {
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
