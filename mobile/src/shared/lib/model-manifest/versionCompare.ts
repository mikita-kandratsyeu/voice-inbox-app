export function isAppVersionAtLeast(current: string, min: string): boolean {
  const ca = current.split('.').map((x) => parseInt(/^\d+/.exec(x)?.[0] ?? '0', 10) || 0);
  const mb = min.split('.').map((x) => parseInt(/^\d+/.exec(x)?.[0] ?? '0', 10) || 0);
  const len = Math.max(ca.length, mb.length);

  for (let i = 0; i < len; i++) {
    const a = ca[i] ?? 0;
    const b = mb[i] ?? 0;

    if (a > b) return true;
    if (a < b) return false;
  }

  return true;
}
