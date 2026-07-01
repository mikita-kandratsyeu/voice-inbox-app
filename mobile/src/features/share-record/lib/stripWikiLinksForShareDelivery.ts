const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/** Placeholder href for follow-up note labels in PDF (not navigable). */
export const SHARE_PDF_WIKI_LINK_HREF = 'vi-wiki-note';

function wikiLinkLabel(ref: string, alias?: string): string {
  return alias?.trim() || ref.trim();
}

function escapeMarkdownLinkLabel(label: string): string {
  return label.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

/** Replaces internal `[[id|label]]` wiki links with readable labels for email / public share. */
export function stripWikiLinksForShareDelivery(markdown: string): string {
  return markdown.replace(WIKI_LINK_REGEX, (_full, ref: string, alias?: string) => {
    return wikiLinkLabel(ref, alias);
  });
}

/** Replaces wiki links with styled markdown links for PDF export (see `.share-pdf-wiki-link`). */
export function formatWikiLinksForSharePdf(markdown: string): string {
  return markdown.replace(WIKI_LINK_REGEX, (_full, ref: string, alias?: string) => {
    const label = escapeMarkdownLinkLabel(wikiLinkLabel(ref, alias));
    return `[${label}](${SHARE_PDF_WIKI_LINK_HREF})`;
  });
}
