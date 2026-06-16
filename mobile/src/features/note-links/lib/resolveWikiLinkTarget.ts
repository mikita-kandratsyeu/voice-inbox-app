export const WIKI_RECORD_ID_PATTERN = /^rec_\d+_[a-z0-9]+$/;

export type WikiLinkResolvableRecord = {
  id: string;
  title: string;
  status?: string;
  createdAt: string;
};

export type WikiLinkIndex = {
  byId: Map<string, WikiLinkResolvableRecord>;
  byNormalizedTitle: Map<string, WikiLinkResolvableRecord[]>;
};

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

export function buildWikiLinkIndex(records: readonly WikiLinkResolvableRecord[]): WikiLinkIndex {
  const byId = new Map<string, WikiLinkResolvableRecord>();
  const byNormalizedTitle = new Map<string, WikiLinkResolvableRecord[]>();

  for (const record of records) {
    if (record.status === 'archived') continue;

    byId.set(record.id, record);

    const key = normalizeTitle(record.title ?? '');
    if (!key) continue;

    const list = byNormalizedTitle.get(key) ?? [];
    list.push(record);
    byNormalizedTitle.set(key, list);
  }

  for (const [key, list] of byNormalizedTitle) {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    byNormalizedTitle.set(key, list);
  }

  return { byId, byNormalizedTitle };
}

export function resolveWikiLinkTarget(ref: string, index: WikiLinkIndex): string | null {
  const trimmed = ref.trim();
  if (!trimmed) return null;

  if (WIKI_RECORD_ID_PATTERN.test(trimmed)) {
    return index.byId.get(trimmed)?.id ?? null;
  }

  const matches = index.byNormalizedTitle.get(normalizeTitle(trimmed));
  return matches?.[0]?.id ?? null;
}
