const HTML_SPECIAL = /[&<>]/g;

export function escapeHtml(text: string): string {
  return text.replace(HTML_SPECIAL, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      default:
        return ch;
    }
  });
}

export function statusEmoji(ok: boolean | undefined, pending = false): string {
  if (pending) return '⏳';
  if (ok === true) return '✅';
  if (ok === false) return '❌';
  return '⚠️';
}

export function maskSecret(value: string | null | undefined, visible = 4): string {
  if (!value?.trim()) return '(none)';
  const t = value.trim();
  if (t.length <= visible) return '•'.repeat(t.length);
  return `${t.slice(0, visible)}${'•'.repeat(Math.min(12, t.length - visible))}`;
}

export function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function formatIsoShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toISOString().replace('T', ' ').slice(0, 16);
  } catch {
    return iso;
  }
}

export function formatCents(amountCents: number, currency: string): string {
  const major = (amountCents / 100).toFixed(2);
  return `${major} ${currency.toUpperCase()}`;
}
