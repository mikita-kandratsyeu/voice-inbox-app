/** Compact label for model context window (e.g. 8192 → "8K", 1_048_576 → "1M"). */
export function formatModelContextTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    const millions = tokens / 1_000_000;
    return Number.isInteger(millions) ? `${millions}M` : `${millions.toFixed(1)}M`;
  }
  if (tokens >= 1024) {
    return `${Math.round(tokens / 1024)}K`;
  }
  return String(tokens);
}
