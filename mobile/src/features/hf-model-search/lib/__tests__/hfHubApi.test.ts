import {
  buildCustomLocalAiModelId,
  buildHfGgufDownloadUrl,
  extractQuantLabel,
  inferDeviceLoadFromSizeMb,
  inferSpeedFromSizeMb,
  listGgufSiblings,
  mapModelDetailToGgufResults,
  quantPreferenceRank,
} from '../hfHubApi';

describe('hfHubApi', () => {
  it('builds stable custom model ids', () => {
    expect(buildCustomLocalAiModelId('unsloth/Qwen3-1.7B-GGUF', 'Qwen3-1.7B-Q4_K_M.gguf')).toBe(
      'local/hf/unsloth_Qwen3-1.7B-GGUF_Qwen3-1.7B-Q4_K_M.gguf',
    );
  });

  it('builds resolve URLs for GGUF files', () => {
    expect(buildHfGgufDownloadUrl('org/model', 'weights.Q4_K_M.gguf')).toBe(
      'https://huggingface.co/org/model/resolve/main/weights.Q4_K_M.gguf',
    );
  });

  it('extracts quantization labels', () => {
    expect(extractQuantLabel('model.Q4_K_M.gguf')).toBe('Q4_K_M');
    expect(extractQuantLabel('model.bin')).toBeNull();
  });

  it('prefers Q4_K_M over heavier quants', () => {
    expect(quantPreferenceRank('a.Q4_K_M.gguf')).toBeLessThan(quantPreferenceRank('b.Q8_0.gguf'));
  });

  it('filters and sorts GGUF siblings by quant and size', () => {
    const picked = listGgufSiblings([
      { rfilename: 'big.Q8_0.gguf', size: 2_000_000_000 },
      { rfilename: 'small.Q4_K_M.gguf', size: 900_000_000 },
      { rfilename: 'readme.txt', size: 100 },
    ]);

    expect(picked.map((s) => s.rfilename)).toEqual(['small.Q4_K_M.gguf', 'big.Q8_0.gguf']);
  });

  it('maps model detail to downloadable results', () => {
    const results = mapModelDetailToGgufResults({
      id: 'unsloth/Qwen3-1.7B-GGUF',
      downloads: 1200,
      siblings: [{ rfilename: 'Qwen3-1.7B-Q4_K_M.gguf', size: 900_000_000 }],
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.repoId).toBe('unsloth/Qwen3-1.7B-GGUF');
    expect(results[0]?.downloadUrl).toContain('huggingface.co');
  });

  it('infers device load and speed from size', () => {
    expect(inferDeviceLoadFromSizeMb(800)).toBe('light');
    expect(inferDeviceLoadFromSizeMb(1500)).toBe('moderate');
    expect(inferDeviceLoadFromSizeMb(2500)).toBe('heavy');
    expect(inferSpeedFromSizeMb(800)).toBe('fast');
    expect(inferSpeedFromSizeMb(1500)).toBe('medium');
    expect(inferSpeedFromSizeMb(2500)).toBe('slow');
  });
});
