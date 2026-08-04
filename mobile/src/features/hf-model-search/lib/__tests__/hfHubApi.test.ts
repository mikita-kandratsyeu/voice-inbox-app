import {
  buildCustomLocalAiModelId,
  buildHfGgufDownloadUrl,
  buildHfModelApiPath,
  buildHfModelDetailUrl,
  buildHfModelTreeUrl,
  buildHfSearchQueries,
  extractQuantLabel,
  inferDeviceLoadFromSizeMb,
  inferSpeedFromSizeMb,
  isInstallableGgufFilename,
  listGgufSiblings,
  mapModelDetailToGgufResults,
  quantPreferenceRank,
  rankHfGgufSearchResults,
  resolveHfFileSizeBytes,
  scoreHfTextMatch,
  searchHfGgufModels,
} from '../hfHubApi';

describe('hfHubApi', () => {
  it('builds stable custom model ids', () => {
    expect(buildCustomLocalAiModelId('unsloth/Qwen3-1.7B-GGUF', 'Qwen3-1.7B-Q4_K_M.gguf')).toBe(
      'local/hf/unsloth_Qwen3-1.7B-GGUF_Qwen3-1.7B-Q4_K_M.gguf',
    );
  });

  it('builds HF model detail URLs without encoding repo slash', () => {
    expect(buildHfModelApiPath('unsloth/Qwen3-1.7B-GGUF')).toBe('unsloth/Qwen3-1.7B-GGUF');
    expect(buildHfModelDetailUrl('unsloth/Qwen3-1.7B-GGUF')).toBe(
      'https://huggingface.co/api/models/unsloth/Qwen3-1.7B-GGUF',
    );
    expect(buildHfModelTreeUrl('unsloth/Qwen3-1.7B-GGUF')).toBe(
      'https://huggingface.co/api/models/unsloth/Qwen3-1.7B-GGUF/tree/main',
    );
    expect(buildHfModelApiPath('org/weird name')).toBe('org/weird%20name');
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

  it('excludes mmproj and split shards from installable GGUF files', () => {
    expect(isInstallableGgufFilename('Qwen3-1.7B-Q4_K_M.gguf')).toBe(true);
    expect(isInstallableGgufFilename('mmproj-Qwen3VL-30B-A3B-Instruct-F16.gguf')).toBe(false);
    expect(isInstallableGgufFilename('Qwen3-VL-8B-Instruct-abliterated.mmproj-Q8_0.gguf')).toBe(
      false,
    );
    expect(
      isInstallableGgufFilename('Qwen3VL-30B-A3B-Instruct-F16-split-00001-of-00002.gguf'),
    ).toBe(false);
    expect(
      isInstallableGgufFilename('BF16/Qwen3-Coder-30B-A3B-Instruct-BF16-00001-of-00002.gguf'),
    ).toBe(false);
  });

  it('resolves HF tree file sizes from LFS payload', () => {
    expect(resolveHfFileSizeBytes({ size: 136, lfs: { size: 1107409472 } })).toBe(1107409472);
    expect(resolveHfFileSizeBytes({ size: 900_000_000 })).toBe(900_000_000);
  });

  it('filters and sorts GGUF siblings by quant and size', () => {
    const picked = listGgufSiblings([
      { rfilename: 'big.Q8_0.gguf', size: 2_000_000_000 },
      { rfilename: 'small.Q4_K_M.gguf', size: 900_000_000 },
      { rfilename: 'readme.txt', size: 100 },
      { rfilename: 'mmproj-model.gguf', size: 100_000_000 },
    ]);

    expect(picked.map((s) => s.rfilename)).toEqual(['small.Q4_K_M.gguf', 'big.Q8_0.gguf']);
  });

  it('drops oversized GGUF files when tree provides sizes', () => {
    const picked = listGgufSiblings([
      { rfilename: 'small.Q4_K_M.gguf', size: 1_100_000_000 },
      { rfilename: 'huge.Q4_K_M.gguf', size: 18_556_687_168 },
    ]);

    expect(picked.map((s) => s.rfilename)).toEqual(['small.Q4_K_M.gguf']);
  });

  it('keeps GGUF siblings when HF omits file size', () => {
    const picked = listGgufSiblings([
      { rfilename: 'model.Q4_K_M.gguf' },
      { rfilename: 'readme.txt' },
    ]);

    expect(picked.map((s) => s.rfilename)).toEqual(['model.Q4_K_M.gguf']);
  });

  it('maps model detail to downloadable results', () => {
    const results = mapModelDetailToGgufResults({
      id: 'unsloth/Qwen3-1.7B-GGUF',
      downloads: 1200,
      siblings: [{ rfilename: 'Qwen3-1.7B-Q4_K_M.gguf', size: 900_000_000 }],
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.repoId).toBe('unsloth/Qwen3-1.7B-GGUF');
    expect(results[0]?.sizeBytes).toBe(900_000_000);
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

  it('builds partial-match search queries', () => {
    expect(buildHfSearchQueries('qwen 3')).toEqual(
      expect.arrayContaining(['qwen 3', 'qwen 3 gguf', 'qwen']),
    );
    expect(buildHfSearchQueries('llama gguf')).toEqual(
      expect.arrayContaining(['llama gguf', 'llama']),
    );
  });

  it('scores partial token matches higher than unrelated text', () => {
    expect(scoreHfTextMatch('unsloth/Qwen3-1.7B-GGUF', 'qwen')).toBeGreaterThan(
      scoreHfTextMatch('meta-llama/Llama-3.2-1B', 'qwen'),
    );
  });

  it('ranks qwen results above unrelated models for qwen query', () => {
    const ranked = rankHfGgufSearchResults(
      [
        {
          repoId: 'meta-llama/Llama-3.2-1B-GGUF',
          fileName: 'model.Q4_K_M.gguf',
          sizeBytes: 900_000_000,
          downloadUrl: 'https://example.com/llama.gguf',
          revision: 'main',
          downloads: 5000,
          displayName: 'Llama',
          provider: 'Meta',
          quantLabel: 'Q4_K_M',
        },
        {
          repoId: 'unsloth/Qwen3-1.7B-GGUF',
          fileName: 'Qwen3-1.7B-Q4_K_M.gguf',
          sizeBytes: 900_000_000,
          downloadUrl: 'https://example.com/qwen.gguf',
          revision: 'main',
          downloads: 1000,
          displayName: 'Qwen3',
          provider: 'Qwen',
          quantLabel: 'Q4_K_M',
        },
      ],
      'qwen',
    );

    expect(ranked[0]?.repoId).toContain('Qwen');
  });

  it('fetches model details and tree sizes without encoded repo slash', async () => {
    const fetchedUrls: string[] = [];
    const mockFetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      fetchedUrls.push(url);
      if (url.includes('/api/models?')) {
        return {
          ok: true,
          json: async () => [{ id: 'unsloth/Qwen3-1.7B-GGUF', downloads: 1000 }],
        };
      }
      if (url.includes('/api/models/unsloth/Qwen3-1.7B-GGUF/tree/main')) {
        return {
          ok: true,
          json: async () => [
            {
              path: 'Qwen3-1.7B-Q4_K_M.gguf',
              size: 135,
              lfs: { size: 900_000_000 },
            },
          ],
        };
      }
      if (url.includes('/api/models/unsloth/Qwen3-1.7B-GGUF')) {
        return {
          ok: true,
          json: async () => ({
            id: 'unsloth/Qwen3-1.7B-GGUF',
            downloads: 1000,
            siblings: [{ rfilename: 'Qwen3-1.7B-Q4_K_M.gguf' }],
          }),
        };
      }
      return { ok: false, json: async () => ({}) };
    }) as unknown as typeof fetch;

    const results = await searchHfGgufModels('qwen', { fetchImpl: mockFetch, limit: 5 });

    expect(fetchedUrls.some((url) => url.includes('/api/models/unsloth/Qwen3-1.7B-GGUF'))).toBe(
      true,
    );
    expect(
      fetchedUrls.some((url) => url.includes('/api/models/unsloth/Qwen3-1.7B-GGUF/tree/main')),
    ).toBe(true);
    expect(fetchedUrls.some((url) => url.includes('unsloth%2F'))).toBe(false);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.sizeBytes).toBe(900_000_000);
  });
});
