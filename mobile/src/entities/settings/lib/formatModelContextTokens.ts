/** Compact label for model context window (e.g. 8192 → "8K", 1_048_576 → "1M"). */
export function formatModelContextTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    const millions = tokens / 1_000_000;
    const label = Number.isInteger(millions)
      ? String(millions)
      : String(parseFloat(millions.toFixed(1)));
    return `${label}M`;
  }
  if (tokens >= 1024) {
    return `${Math.round(tokens / 1024)}K`;
  }
  return String(tokens);
}
