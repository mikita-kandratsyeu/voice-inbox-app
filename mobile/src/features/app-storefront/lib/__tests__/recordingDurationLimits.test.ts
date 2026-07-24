import {
  FREE_MAX_RECORDING_MS,
  getMaxRecordingMsForTier,
  PRIVATE_MAX_RECORDING_MS,
  PRO_MAX_RECORDING_MS,
} from '../recordingDurationLimits';

describe('getMaxRecordingMsForTier', () => {
  it('returns free cap for non-Pro smart hybrid', () => {
    expect(getMaxRecordingMsForTier(false)).toBe(FREE_MAX_RECORDING_MS);
  });

  it('returns Pro cap for Pro smart hybrid', () => {
    expect(getMaxRecordingMsForTier(true)).toBe(PRO_MAX_RECORDING_MS);
  });

  it('returns private cap for local private experimental mode', () => {
    expect(getMaxRecordingMsForTier(true, 'private_experimental', 'local')).toBe(
      PRIVATE_MAX_RECORDING_MS,
    );
    expect(getMaxRecordingMsForTier(false, 'private_experimental', 'local')).toBe(
      PRIVATE_MAX_RECORDING_MS,
    );
  });

  it('uses Pro cap for custom OpenAI when Pro is active', () => {
    expect(getMaxRecordingMsForTier(true, 'private_experimental', 'custom_openai')).toBe(
      PRO_MAX_RECORDING_MS,
    );
  });

  it('uses private cap for custom OpenAI when not Pro', () => {
    expect(getMaxRecordingMsForTier(false, 'private_experimental', 'custom_openai')).toBe(
      PRIVATE_MAX_RECORDING_MS,
    );
  });
});
