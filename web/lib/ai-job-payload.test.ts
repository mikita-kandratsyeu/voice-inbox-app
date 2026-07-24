import { JOB_PAYLOAD_KEY_PREFIX } from '../config/constants';
import { envelopeFromPayload, getJobPayloadKey } from './ai-job-payload';

describe('ai-job-payload', () => {
  it('getJobPayloadKey prefixes job id', () => {
    expect(getJobPayloadKey('job-123')).toBe(`${JOB_PAYLOAD_KEY_PREFIX}job-123`);
  });

  it('envelopeFromPayload strips heavy fields', () => {
    const envelope = envelopeFromPayload({
      operation: 'transcript_summarize',
      jobId: 'job-1',
      deviceId: 'device-1',
      messageTtlSeconds: 3600,
      transcript: 'hello',
      model: 'openai/gpt-5.4-nano',
      systemPrompt: 'system',
      pseudoDiarizationEligible: false,
    });

    expect(envelope).toEqual({
      jobId: 'job-1',
      operation: 'transcript_summarize',
      deviceId: 'device-1',
      messageTtlSeconds: 3600,
    });
  });
});
