import type { LocalAiDeviceLoad } from '@/entities/settings/model/constants';
import type { CustomLocalAiModelEntry, LocalAiModelId } from '@/entities/settings/model/types';
import { isInstallableGgufFilename } from '@/shared/lib/local-llm/isInstallableGgufFile';

export { isInstallableGgufFilename };

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

type HfTreeEntry = {
  path?: string;
  size?: number;
  lfs?: { size?: number };
};

type HfModelDetail = {
  id?: string;
  siblings?: HfModelSibling[];
  downloads?: number;
};

const HF_API = 'https://huggingface.co/api';

/** HF expects `owner/repo` path segments — never encode the slash between them. */
export function buildHfModelApiPath(repoId: string): string {
  return repoId
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function buildHfModelDetailUrl(repoId: string): string {
  return `${HF_API}/models/${buildHfModelApiPath(repoId)}`;
}

export function buildHfModelTreeUrl(repoId: string, revision = 'main'): string {
  return `${HF_API}/models/${buildHfModelApiPath(repoId)}/tree/${revision}`;
}

/** HF tree entries store LFS payload size separately from the pointer `size`. */
export function resolveHfFileSizeBytes(entry: { size?: number; lfs?: { size?: number } }): number {
  return entry.lfs?.size ?? entry.size ?? 0;
}

function buildSizeMapFromTree(tree: HfTreeEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of tree) {
    const path = entry.path?.trim();
    if (!path) continue;
    const size = resolveHfFileSizeBytes(entry);
    if (size <= 0) continue;
    map.set(path, size);
    const baseName = path.split('/').pop();
    if (baseName && !map.has(baseName)) {
      map.set(baseName, size);
    }
  }
  return map;
}

function enrichSiblingsWithTreeSizes(
  siblings: HfModelSibling[] | undefined,
  sizeByPath: Map<string, number>,
): HfModelSibling[] {
  if (!siblings?.length) return [];
  return siblings.map((s) => {
    const name = s.rfilename ?? '';
    const treeSize =
      (name ? sizeByPath.get(name) : undefined) ??
      (name ? sizeByPath.get(name.split('/').pop() ?? '') : undefined);
    if (treeSize && treeSize > 0) {
      return { ...s, size: treeSize };
    }
    return s;
  });
}

async function fetchHfModelTree(
  repoId: string,
  fetchImpl: typeof fetch,
  revision = 'main',
): Promise<HfTreeEntry[]> {
  try {
    const treeRes = await fetchImpl(buildHfModelTreeUrl(repoId, revision));
    if (!treeRes.ok) return [];
    const tree = (await treeRes.json()) as HfTreeEntry[];
    return Array.isArray(tree) ? tree : [];
  } catch {
    return [];
  }
}

/** Debounce delay aligned with in-app search bars (e.g. notes graph). */
export const HF_GGUF_SEARCH_DEBOUNCE_MS = 300;

export function tokenizeHfSearchQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/** Builds HF Hub search queries for partial / fuzzy discovery. */
export function buildHfSearchQueries(raw: string): string[] {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 2) return [];

  const queries = new Set<string>([trimmed]);

  if (!/\bgguf\b/i.test(trimmed)) {
    queries.add(`${trimmed} gguf`);
  }

  const tokens = tokenizeHfSearchQuery(trimmed);
  if (tokens.length > 1 && tokens[0]) {
    queries.add(tokens[0]);
  }

  return [...queries];
}

export function scoreHfTextMatch(text: string, query: string): number {
  const haystack = text.toLowerCase();
  const normalized = query.trim().toLowerCase();
  if (!normalized) return 0;

  let score = 0;
  if (haystack.includes(normalized)) {
    score += 120;
  }

  for (const token of tokenizeHfSearchQuery(normalized)) {
    if (!haystack.includes(token)) continue;
    score += 30;
    if (
      haystack.startsWith(token) ||
      haystack.includes(`-${token}`) ||
      haystack.includes(`_${token}`) ||
      haystack.includes(`.${token}`)
    ) {
      score += 12;
    }
  }

  return score;
}

export function scoreHfGgufSearchResult(result: HfGgufSearchResult, query: string): number {
  const relevance =
    scoreHfTextMatch(result.repoId, query) * 1.25 +
    scoreHfTextMatch(result.fileName, query) * 1.1 +
    scoreHfTextMatch(result.displayName, query);

  const quantBonus = result.quantLabel === 'Q4_K_M' ? 8 : 0;
  const popularity = Math.log10(Math.max(result.downloads, 1) + 1) * 6;

  return relevance + quantBonus + popularity;
}

export function rankHfGgufSearchResults(
  results: HfGgufSearchResult[],
  query: string,
): HfGgufSearchResult[] {
  return [...results].sort((a, b) => {
    const scoreDelta = scoreHfGgufSearchResult(b, query) - scoreHfGgufSearchResult(a, query);
    if (scoreDelta !== 0) return scoreDelta;

    if (b.downloads !== a.downloads) return b.downloads - a.downloads;

    const rankA = quantPreferenceRank(a.fileName);
    const rankB = quantPreferenceRank(b.fileName);
    if (rankA !== rankB) return rankA - rankB;

    return a.sizeBytes - b.sizeBytes;
  });
}

async function fetchHfModelList(
  searchQuery: string,
  fetchImpl: typeof fetch,
  options: { limit: number; ggufTagFilter: boolean },
): Promise<HfModelListItem[]> {
  const params = new URLSearchParams({
    search: searchQuery,
    sort: 'downloads',
    direction: '-1',
    limit: String(options.limit),
  });
  if (options.ggufTagFilter) {
    params.set('filter', 'gguf');
  }

  const listRes = await fetchImpl(`${HF_API}/models?${params.toString()}`);
  if (!listRes.ok) {
    throw new Error(`Hugging Face search failed (${listRes.status})`);
  }

  const models = (await listRes.json()) as HfModelListItem[];
  return Array.isArray(models) ? models : [];
}

function mergeHfModelListItems(lists: HfModelListItem[][]): HfModelListItem[] {
  const byId = new Map<string, HfModelListItem>();

  for (const list of lists) {
    for (const model of list) {
      const id = model.id?.trim();
      if (!id) continue;

      const existing = byId.get(id);
      if (!existing || (model.downloads ?? 0) > (existing.downloads ?? 0)) {
        byId.set(id, model);
      }
    }
  }

  return [...byId.values()];
}

function rankHfModelListItems(items: HfModelListItem[], query: string): HfModelListItem[] {
  return [...items].sort((a, b) => {
    const idA = a.id ?? '';
    const idB = b.id ?? '';
    const ggufBoostA = /gguf/i.test(idA) ? 40 : 0;
    const ggufBoostB = /gguf/i.test(idB) ? 40 : 0;
    const scoreDelta =
      scoreHfTextMatch(idB, query) + ggufBoostB - (scoreHfTextMatch(idA, query) + ggufBoostA);
    if (scoreDelta !== 0) return scoreDelta;
    return (b.downloads ?? 0) - (a.downloads ?? 0);
  });
}

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
      if (!isInstallableGgufFilename(name)) return false;
      const size = s.size ?? 0;
      // HF model detail often omits sibling sizes; keep until tree lookup fills them in.
      if (size <= 0) return true;
      return size <= maxSizeBytes;
    })
    .sort((a, b) => {
      const rankA = quantPreferenceRank(a.rfilename ?? '');
      const rankB = quantPreferenceRank(b.rfilename ?? '');
      if (rankA !== rankB) return rankA - rankB;
      const sizeA = a.size && a.size > 0 ? a.size : Number.MAX_SAFE_INTEGER;
      const sizeB = b.size && b.size > 0 ? b.size : Number.MAX_SAFE_INTEGER;
      return sizeA - sizeB;
    });
}

export function buildCustomEntryFromSearchResult(
  result: HfGgufSearchResult,
): CustomLocalAiModelEntry {
  const sizeMb =
    result.sizeBytes > 0 ? Math.max(1, Math.round(result.sizeBytes / (1024 * 1024))) : 0;
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
    detailFetchLimit?: number;
  },
): Promise<HfGgufSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const limit = options?.limit ?? 12;
  const fetchImpl = options?.fetchImpl ?? fetch;
  const maxSizeBytes = options?.maxSizeBytes ?? HF_GGUF_MAX_SIZE_BYTES;
  const detailFetchLimit = options?.detailFetchLimit ?? 18;

  const searchQueries = buildHfSearchQueries(trimmed);
  if (searchQueries.length === 0) return [];

  const listBatches = await Promise.all(
    searchQueries.map((searchQuery, index) =>
      fetchHfModelList(searchQuery, fetchImpl, {
        limit: limit + 6,
        ggufTagFilter: index > 0 || /\bgguf\b/i.test(searchQuery),
      }).catch(() => [] as HfModelListItem[]),
    ),
  );

  const mergedModels = rankHfModelListItems(mergeHfModelListItems(listBatches), trimmed).slice(
    0,
    detailFetchLimit,
  );

  if (mergedModels.length === 0) return [];

  const detailResults = await Promise.all(
    mergedModels.map(async (model) => {
      const repoId = model.id?.trim();
      if (!repoId) return [] as HfGgufSearchResult[];

      try {
        const [detailRes, tree] = await Promise.all([
          fetchImpl(buildHfModelDetailUrl(repoId)),
          fetchHfModelTree(repoId, fetchImpl),
        ]);
        if (!detailRes.ok) return [];
        const detail = (await detailRes.json()) as HfModelDetail;
        const sizeByPath = buildSizeMapFromTree(tree);
        const siblings = enrichSiblingsWithTreeSizes(detail.siblings, sizeByPath);
        return mapModelDetailToGgufResults(
          { ...detail, siblings, downloads: detail.downloads ?? model.downloads },
          'main',
          maxSizeBytes,
        );
      } catch {
        return [];
      }
    }),
  );

  const flat = detailResults.flat();
  const ranked = rankHfGgufSearchResults(flat, trimmed);

  const seen = new Set<string>();
  const deduped: HfGgufSearchResult[] = [];
  for (const item of ranked) {
    const key = `${item.repoId}/${item.fileName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
    if (deduped.length >= limit) break;
  }

  return deduped;
}
