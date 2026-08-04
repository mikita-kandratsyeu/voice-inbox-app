import type { LocalAiDeviceLoad } from '@/entities/settings/model/constants';
import type { CustomLocalAiModelEntry, LocalAiModelId } from '@/entities/settings/model/types';

/** Max GGUF size shown in search results (~3 GB). */
export const HF_GGUF_MAX_SIZE_BYTES = 3 * 1024 * 1024 * 1024;

const QUANT_RANK: Record<string, number> = {
  Q4_K_M: 0,
  Q4_K_S: 1,
  Q5_K_M: 2,
  Q4_0: 3,
  Q5_0: 4,
  Q3_K_M: 5,
  Q3_K_S: 6,
  Q2_K: 7,
  Q6_K: 8,
  Q8_0: 9,
};

export type HfGgufSearchResult = {
  repoId: string;
  fileName: string;
  sizeBytes: number;
  downloadUrl: string;
  revision: string;
  downloads: number;
  displayName: string;
  provider: string;
  quantLabel: string | null;
};

type HfModelListItem = {
  id?: string;
  downloads?: number;
};

type HfModelSibling = {
  rfilename?: string;
  size?: number;
};

type HfModelDetail = {
  id?: string;
  siblings?: HfModelSibling[];
  downloads?: number;
};

const HF_API = 'https://huggingface.co/api';

export function buildCustomLocalAiModelId(hfRepo: string, fileName: string): LocalAiModelId {
  const slug = `${hfRepo}/${fileName}`.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return `local/hf/${slug}` as LocalAiModelId;
}

export function buildHfGgufDownloadUrl(
  repoId: string,
  fileName: string,
  revision = 'main',
): string {
  return `https://huggingface.co/${repoId}/resolve/${revision}/${encodeURIComponent(fileName)}`;
}

export function extractQuantLabel(fileName: string): string | null {
  const match = fileName.match(/\.(Q\d+(?:_K(?:_[SM])?|_0)?)\.gguf$/i);
  return match?.[1]?.toUpperCase() ?? null;
}

export function quantPreferenceRank(fileName: string): number {
  const quant = extractQuantLabel(fileName);
  if (!quant) return 100;
  return QUANT_RANK[quant] ?? 50;
}

export function inferDeviceLoadFromSizeMb(sizeMb: number): LocalAiDeviceLoad {
  if (sizeMb < 1000) return 'light';
  if (sizeMb < 2000) return 'moderate';
  return 'heavy';
}

export function inferSpeedFromSizeMb(sizeMb: number): 'fast' | 'medium' | 'slow' {
  if (sizeMb < 900) return 'fast';
  if (sizeMb < 1800) return 'medium';
  return 'slow';
}

export function formatHfModelDisplayName(repoId: string, fileName: string): string {
  const repoTail = repoId.split('/').pop() ?? repoId;
  const base = fileName.replace(/\.gguf$/i, '');
  if (base.length <= 48) return base;
  return `${repoTail} · ${base.slice(0, 40)}…`;
}

export function hfRepoProvider(repoId: string): string {
  const [owner] = repoId.split('/');
  if (!owner) return 'Hugging Face';
  if (owner.toLowerCase().includes('meta')) return 'Meta';
  if (owner.toLowerCase().includes('google')) return 'Google';
  if (owner.toLowerCase().includes('qwen')) return 'Qwen';
  if (owner.toLowerCase().includes('mistral')) return 'Mistral';
  return owner;
}

export function listGgufSiblings(
  siblings: HfModelSibling[] | undefined,
  maxSizeBytes = HF_GGUF_MAX_SIZE_BYTES,
): HfModelSibling[] {
  if (!siblings?.length) return [];

  return siblings
    .filter((s) => {
      const name = s.rfilename ?? '';
      if (!name.toLowerCase().endsWith('.gguf')) return false;
      const size = s.size ?? 0;
      return size > 0 && size <= maxSizeBytes;
    })
    .sort((a, b) => {
      const rankA = quantPreferenceRank(a.rfilename ?? '');
      const rankB = quantPreferenceRank(b.rfilename ?? '');
      if (rankA !== rankB) return rankA - rankB;
      return (a.size ?? 0) - (b.size ?? 0);
    });
}

export function buildCustomEntryFromSearchResult(
  result: HfGgufSearchResult,
): CustomLocalAiModelEntry {
  const sizeMb = Math.max(1, Math.round(result.sizeBytes / (1024 * 1024)));
  const quant = result.quantLabel;

  return {
    id: buildCustomLocalAiModelId(result.repoId, result.fileName),
    name: result.displayName,
    provider: result.provider,
    description: quant ? `GGUF ${quant} from ${result.repoId}` : `GGUF from ${result.repoId}`,
    speed: inferSpeedFromSizeMb(sizeMb),
    deviceLoad: inferDeviceLoadFromSizeMb(sizeMb),
    fileName: result.fileName,
    sizeMb,
    downloadUrl: result.downloadUrl,
    hfRepo: result.repoId,
    hfRevision: result.revision,
  };
}

export function mapModelDetailToGgufResults(
  detail: HfModelDetail,
  revision = 'main',
  maxSizeBytes = HF_GGUF_MAX_SIZE_BYTES,
): HfGgufSearchResult[] {
  const repoId = detail.id?.trim();
  if (!repoId) return [];

  const downloads = detail.downloads ?? 0;
  const ggufFiles = listGgufSiblings(detail.siblings, maxSizeBytes).slice(0, 3);

  return ggufFiles.map((file) => {
    const fileName = file.rfilename ?? 'model.gguf';
    return {
      repoId,
      fileName,
      sizeBytes: file.size ?? 0,
      downloadUrl: buildHfGgufDownloadUrl(repoId, fileName, revision),
      revision,
      downloads,
      displayName: formatHfModelDisplayName(repoId, fileName),
      provider: hfRepoProvider(repoId),
      quantLabel: extractQuantLabel(fileName),
    };
  });
}

export async function searchHfGgufModels(
  query: string,
  options?: {
    limit?: number;
    fetchImpl?: typeof fetch;
    maxSizeBytes?: number;
  },
): Promise<HfGgufSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const limit = options?.limit ?? 12;
  const fetchImpl = options?.fetchImpl ?? fetch;
  const maxSizeBytes = options?.maxSizeBytes ?? HF_GGUF_MAX_SIZE_BYTES;

  const searchUrl = `${HF_API}/models?search=${encodeURIComponent(trimmed)}&filter=gguf&sort=downloads&direction=-1&limit=${limit}`;
  const listRes = await fetchImpl(searchUrl);
  if (!listRes.ok) {
    throw new Error(`Hugging Face search failed (${listRes.status})`);
  }

  const models = (await listRes.json()) as HfModelListItem[];
  if (!Array.isArray(models) || models.length === 0) return [];

  const detailResults = await Promise.all(
    models.map(async (model) => {
      const repoId = model.id?.trim();
      if (!repoId) return [] as HfGgufSearchResult[];

      try {
        const detailRes = await fetchImpl(`${HF_API}/models/${encodeURIComponent(repoId)}`);
        if (!detailRes.ok) return [];
        const detail = (await detailRes.json()) as HfModelDetail;
        return mapModelDetailToGgufResults(
          { ...detail, downloads: detail.downloads ?? model.downloads },
          'main',
          maxSizeBytes,
        );
      } catch {
        return [];
      }
    }),
  );

  const flat = detailResults.flat();
  flat.sort((a, b) => {
    if (b.downloads !== a.downloads) return b.downloads - a.downloads;
    const rankA = quantPreferenceRank(a.fileName);
    const rankB = quantPreferenceRank(b.fileName);
    if (rankA !== rankB) return rankA - rankB;
    return a.sizeBytes - b.sizeBytes;
  });

  const seen = new Set<string>();
  const deduped: HfGgufSearchResult[] = [];
  for (const item of flat) {
    const key = `${item.repoId}/${item.fileName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
    if (deduped.length >= limit) break;
  }

  return deduped;
}
