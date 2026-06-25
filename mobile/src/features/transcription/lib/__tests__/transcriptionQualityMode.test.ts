import {
  applyQualityModeToChunkProfile,
  resolveVadPolicyForMode,
  resolveWhisperModelForQualityMode,
} from '../transcriptionQualityMode';

describe('transcriptionQualityMode', () => {
  it('maps quality modes to VAD policies', () => {
    expect(resolveVadPolicyForMode('fast')).toBe('trimSilence');
    expect(resolveVadPolicyForMode('balanced')).toBe('skipSilentOnly');
    expect(resolveVadPolicyForMode('quality')).toBe('skipSilentOnly');
  });

  it('adjusts chunk profiles per quality mode', () => {
    const base = { chunkDurationSec: 45, chunkOverlapSec: 4 };

    expect(applyQualityModeToChunkProfile('fast', base, 'medium')).toEqual({
      chunkDurationSec: 30,
      chunkOverlapSec: 4,
    });
    expect(applyQualityModeToChunkProfile('balanced', base, 'medium')).toEqual(base);
    expect(applyQualityModeToChunkProfile('quality', base, 'high')).toEqual({
      chunkDurationSec: 60,
      chunkOverlapSec: 4,
    });
  });

  it('resolves whisper models per quality mode', () => {
    expect(resolveWhisperModelForQualityMode('fast', 'q5_1', 'whisper-small')).toEqual({
      modelId: 'whisper-base',
      format: 'q5_1',
    });
    expect(resolveWhisperModelForQualityMode('balanced', 'q5_1', 'whisper-small')).toEqual({
      modelId: 'whisper-small',
      format: 'q5_1',
    });
  });
});
