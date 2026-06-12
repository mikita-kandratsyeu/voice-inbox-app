jest.mock('@/entities/settings', () => ({
  isPrivateCustomServerMode: (mode: string, provider: string, isPro: boolean) =>
    mode === 'private_experimental' && provider === 'custom_openai' && isPro,
}));

import {
  isMeetingSpeakerSettingsAvailable,
  shouldIncludeMeetingSpeakerBreakdown,
} from '../meetingSpeakerBreakdown';

describe('meetingSpeakerBreakdown gates', () => {
  describe('isMeetingSpeakerSettingsAvailable', () => {
    it('is available in Smart with Pro', () => {
      expect(isMeetingSpeakerSettingsAvailable('smart_hybrid', 'local', true)).toBe(true);
    });

    it('is available in Private custom server with Pro', () => {
      expect(isMeetingSpeakerSettingsAvailable('private_experimental', 'custom_openai', true)).toBe(
        true,
      );
    });

    it('is hidden in Private local LLM', () => {
      expect(isMeetingSpeakerSettingsAvailable('private_experimental', 'local', true)).toBe(false);
    });
  });

  describe('shouldIncludeMeetingSpeakerBreakdown', () => {
    const base = {
      isProActive: true,
      recordIsMeeting: true,
      wasSummaryRegeneration: false,
      aiExecutionMode: 'private_experimental' as const,
      privateAiProvider: 'custom_openai' as const,
      autoRefreshMeetingSpeakersOnRegen: false,
    };

    it('runs on first summary for Private custom server', () => {
      expect(shouldIncludeMeetingSpeakerBreakdown(base)).toBe(true);
    });

    it('skips regen when auto-refresh is off', () => {
      expect(
        shouldIncludeMeetingSpeakerBreakdown({
          ...base,
          wasSummaryRegeneration: true,
          autoRefreshMeetingSpeakersOnRegen: false,
        }),
      ).toBe(false);
    });

    it('runs regen when auto-refresh is on', () => {
      expect(
        shouldIncludeMeetingSpeakerBreakdown({
          ...base,
          wasSummaryRegeneration: true,
          autoRefreshMeetingSpeakersOnRegen: true,
        }),
      ).toBe(true);
    });

    it('does not run for Private local LLM', () => {
      expect(
        shouldIncludeMeetingSpeakerBreakdown({
          ...base,
          privateAiProvider: 'local',
        }),
      ).toBe(false);
    });
  });
});
