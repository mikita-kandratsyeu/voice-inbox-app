export const AUTO_ORGANIZE_MAX_TRANSCRIPT_CHARS = 900;
export const AUTO_ORGANIZE_TRANSCRIPT_HINT_MAX_CHARS = 280;
export const AUTO_ORGANIZE_MAX_SUMMARY_CHARS = 360;
export const AUTO_ORGANIZE_MAX_TITLE_CHARS = 100;

const EXCERPT_GAP = '\n…\n';
export function smartTranscriptExcerpt(text: string, maxChars: number): string {
  const t = text.trim();

  if (t.length <= maxChars) return t;
  if (maxChars <= EXCERPT_GAP.length + 2) return t.slice(0, maxChars);

  const budget = maxChars - EXCERPT_GAP.length;
  const headLen = Math.ceil(budget / 2);
  const tailLen = Math.floor(budget / 2);

  return `${t.slice(0, headLen)}${EXCERPT_GAP}${t.slice(-tailLen)}`;
}
