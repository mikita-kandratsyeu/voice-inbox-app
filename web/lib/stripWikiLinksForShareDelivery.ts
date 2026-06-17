const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/** Replaces internal `[[id|label]]` wiki links with readable labels for email / public share. */
export function stripWikiLinksForShareDelivery(markdown: string): string {
  return markdown.replace(WIKI_LINK_REGEX, (_full, ref: string, alias?: string) => {
    return alias?.trim() || ref.trim();
  });
}
