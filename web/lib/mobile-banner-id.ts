type SuggestMobileBannerIdInput = {
  titleEn?: string;
  titleRu?: string;
  startsAt?: string | null;
  now?: Date;
};

function slugifyBannerIdPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

function formatBannerIdDate(value: string | null | undefined, now: Date): string {
  if (value?.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10).replace(/-/g, '');
    }
  }
  return now.toISOString().slice(0, 10).replace(/-/g, '');
}

export function suggestMobileBannerId(input: SuggestMobileBannerIdInput = {}): string {
  const now = input.now ?? new Date();
  const titleSource = input.titleEn?.trim() || input.titleRu?.trim() || '';
  const titlePart = slugifyBannerIdPart(titleSource) || 'banner';
  const datePart = formatBannerIdDate(input.startsAt, now);
  return `${titlePart}_${datePart}`.slice(0, 128);
}
