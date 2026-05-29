/** Strips trailing `...`, `…`, or mixed ellipsis so dots can be animated separately. */
export function splitTrailingEllipsis(title: string): { base: string; hasEllipsis: boolean } {
  const match = title.match(/^(.*?)(?:\.{2,3}|…+)\s*$/u);
  if (!match) {
    return { base: title, hasEllipsis: false };
  }
  return { base: match[1], hasEllipsis: true };
}
