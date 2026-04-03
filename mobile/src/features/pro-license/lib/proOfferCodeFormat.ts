export const PRO_OFFER_CODE_SEGMENT_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' as const;

export function parseProOfferCodeInput(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[\s\-_.]/g, '');
  if (cleaned.length === 0) {
    return '';
  }

  const takeSegmentChars = (from: string): string =>
    [...from]
      .filter((c) => PRO_OFFER_CODE_SEGMENT_ALPHABET.includes(c))
      .join('')
      .slice(0, 12);

  if (cleaned.startsWith('VI')) {
    return `VI${takeSegmentChars(cleaned.slice(2))}`;
  }

  if (cleaned.startsWith('V')) {
    if (cleaned.length === 1) {
      return 'V';
    }
    if (cleaned[1] === 'I') {
      return `VI${takeSegmentChars(cleaned.slice(2))}`;
    }
    return 'V';
  }

  return '';
}

export function formatProOfferCodeDisplay(compact: string): string {
  if (compact.length === 0) {
    return '';
  }

  if (compact.length === 1) {
    return 'V';
  }

  if (compact.length === 2) {
    return 'VI';
  }

  const rest = compact.slice(2);
  const a = rest.slice(0, 4);
  const b = rest.slice(4, 8);
  const c = rest.slice(8, 12);
  let out = `VI-${a}`;
  if (b.length > 0) {
    out += `-${b}`;
  }
  if (c.length > 0) {
    out += `-${c}`;
  }
  return out;
}

export function isCompleteProOfferCode(compact: string): boolean {
  return compact.length === 14;
}
