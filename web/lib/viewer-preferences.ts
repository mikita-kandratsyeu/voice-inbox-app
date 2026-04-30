const COLLAPSED_KEY = 'voice-inbox-viewer-sidebar-collapsed';
const WIDTH_PCT_KEY = 'voice-inbox-viewer-sidebar-width-pct';

const MIN_W = 24;
const MAX_W = 52;
const DEFAULT_W = 36;

export function readSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function readSidebarWidthPct(): number {
  if (typeof window === 'undefined') return DEFAULT_W;
  try {
    const n = Number(window.localStorage.getItem(WIDTH_PCT_KEY));
    if (!Number.isFinite(n)) return DEFAULT_W;
    return Math.min(MAX_W, Math.max(MIN_W, n));
  } catch {
    return DEFAULT_W;
  }
}

export function writeSidebarWidthPct(pct: number): void {
  if (typeof window === 'undefined') return;
  try {
    const clamped = Math.min(MAX_W, Math.max(MIN_W, Math.round(pct)));
    window.localStorage.setItem(WIDTH_PCT_KEY, String(clamped));
  } catch {
    /* ignore */
  }
}

export const viewerSidebarWidthBounds = { min: MIN_W, max: MAX_W, default: DEFAULT_W };
