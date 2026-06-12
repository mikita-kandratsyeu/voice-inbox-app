export function normalizeMarkdownLinkUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isValidMarkdownLinkUrl(url: string): boolean {
  const normalized = normalizeMarkdownLinkUrl(url);
  return /^https?:\/\/.+/i.test(normalized);
}
