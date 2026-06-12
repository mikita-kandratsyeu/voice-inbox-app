jest.mock('@/entities/settings', () => ({
  isPrivateCustomServerMode: (mode: string, provider: string, isPro: boolean) =>
    mode === 'private_experimental' && provider === 'custom_openai' && isPro,
}));

import {
  shouldApplyAutoAiAfterTranscription,
  shouldApplyAutoTranscribeOnSave,
  shouldApplyPrivateServerAutoAi,
} from '../effectiveAutomation';

describe('effectiveAutomation', () => {
  describe('shouldApplyAutoTranscribeOnSave', () => {
    it('requires Pro in smart mode', () => {
      expect(shouldApplyAutoTranscribeOnSave(true, false, 'smart_hybrid')).toBe(false);
      expect(shouldApplyAutoTranscribeOnSave(true, true, 'smart_hybrid')).toBe(true);
    });

    it('allows private mode without Pro', () => {
      expect(shouldApplyAutoTranscribeOnSave(true, false, 'private_experimental')).toBe(true);
      expect(shouldApplyAutoTranscribeOnSave(false, false, 'private_experimental')).toBe(false);
    });
  });

  describe('shouldApplyPrivateServerAutoAi', () => {
    it('requires Pro and toggle', () => {
      expect(shouldApplyPrivateServerAutoAi(true, true)).toBe(true);
      expect(shouldApplyPrivateServerAutoAi(true, false)).toBe(false);
      expect(shouldApplyPrivateServerAutoAi(false, true)).toBe(false);
    });
  });

  describe('shouldApplyAutoAiAfterTranscription', () => {
    it('uses private server gate in custom server mode', () => {
      expect(
        shouldApplyAutoAiAfterTranscription(true, true, 'private_experimental', 'custom_openai'),
      ).toBe(true);
      expect(
        shouldApplyAutoAiAfterTranscription(true, false, 'private_experimental', 'custom_openai'),
      ).toBe(false);
    });

    it('does not auto-summarize for private local-only', () => {
      expect(shouldApplyAutoAiAfterTranscription(true, true, 'private_experimental', 'local')).toBe(
        false,
      );
    });

    it('falls back to smart rules outside private server mode', () => {
      expect(shouldApplyAutoAiAfterTranscription(true, false, 'smart_hybrid', 'local')).toBe(false);
      expect(shouldApplyAutoAiAfterTranscription(true, true, 'smart_hybrid', 'local')).toBe(true);
    });
  });
});
