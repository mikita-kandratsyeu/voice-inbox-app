const MAX_AMOUNT_CENTS = 99_999_999_99;

export function parseAmountToCents(
  raw: unknown,
): { ok: true; cents: number } | { ok: false; error: string } {
  if (raw === null || raw === undefined) {
    return { ok: false, error: 'Amount is required' };
  }
  const s = typeof raw === 'number' ? String(raw) : String(raw).trim();
  if (!s) {
    return { ok: false, error: 'Amount is required' };
  }
  const normalized = s.replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return { ok: false, error: 'Use a number with up to 2 decimal places (e.g. 24.50)' };
  }
  const [whole, frac = ''] = normalized.split('.');
  const cents =
    parseInt(whole, 10) * 100 + (frac.length === 0 ? 0 : parseInt((frac + '00').slice(0, 2), 10));
  if (!Number.isFinite(cents) || cents < 0) {
    return { ok: false, error: 'Invalid amount' };
  }
  if (cents > MAX_AMOUNT_CENTS) {
    return { ok: false, error: 'Amount is too large' };
  }
  return { ok: true, cents };
}

export function formatCents(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.length === 3 ? currency : 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}
