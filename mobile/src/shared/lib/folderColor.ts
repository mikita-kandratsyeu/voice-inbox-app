import {
  ACCENT_COLOR_IDS,
  ACCENT_COLOR_SWATCHES,
  type AccentColorId,
  type Colors,
  type ColorScheme,
  DEFAULT_ACCENT_COLOR_ID,
  getAccentPreviewHex,
} from '@/shared/config';

export const DEFAULT_FOLDER_BRAND_HEX = ACCENT_COLOR_SWATCHES[0].previewHex;

function accentHexKeysForId(id: AccentColorId): string[] {
  const light = getAccentPreviewHex(id, 'light');
  const dark = getAccentPreviewHex(id, 'dark');
  if (light.toLowerCase() === dark.toLowerCase()) return [light];
  return [light, dark];
}

export function resolveFolderColorForCurrentScheme(
  storedHex: string | null | undefined,
  scheme: ColorScheme,
): string {
  const raw = storedHex?.trim();
  if (!raw) {
    return DEFAULT_FOLDER_BRAND_HEX;
  }

  const normalized = raw.toLowerCase();

  for (const id of ACCENT_COLOR_IDS) {
    for (const h of accentHexKeysForId(id)) {
      if (h.toLowerCase() === normalized) {
        return getAccentPreviewHex(id, scheme);
      }
    }
  }

  const rgb = parseRgbFromHex(raw);
  if (!rgb) {
    return DEFAULT_FOLDER_BRAND_HEX;
  }

  let bestId: AccentColorId = DEFAULT_ACCENT_COLOR_ID;
  let bestDist = Infinity;

  for (const id of ACCENT_COLOR_IDS) {
    for (const h of accentHexKeysForId(id)) {
      const p = parseRgbFromHex(h);

      if (!p) {
        continue;
      }

      const d = (p.r - rgb.r) ** 2 + (p.g - rgb.g) ** 2 + (p.b - rgb.b) ** 2;

      if (d < bestDist) {
        bestDist = d;
        bestId = id;
      }
    }
  }

  return getAccentPreviewHex(bestId, scheme);
}

/** Nav chips, sidebar, reorder — non‑Pro gets one default accent for every folder. */
export function resolveDisplayFolderColor(
  storedHex: string | null | undefined,
  isPro: boolean,
): string {
  const raw = storedHex?.trim();
  if (isPro && raw) return raw;
  return DEFAULT_FOLDER_BRAND_HEX;
}

/** List rows, pickers, related notes, detail folder chip — non‑Pro → neutral (undefined). */
export function resolveFolderListTintHex(
  storedHex: string | null | undefined,
  isPro: boolean,
  scheme: ColorScheme,
): string | undefined {
  if (!isPro) return undefined;
  return resolveFolderColorForCurrentScheme(resolveDisplayFolderColor(storedHex, true), scheme);
}

export function parseRgbFromHex(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace('#', '');
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b };
  }
  return null;
}

function channelToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function relativeLuminanceFromHex(hex: string): number | null {
  const rgb = parseRgbFromHex(hex);
  if (!rgb) return null;
  const R = channelToLinear(rgb.r);
  const G = channelToLinear(rgb.g);
  const B = channelToLinear(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function withAlphaHex(hex: string, alpha: number): string {
  const rgb = parseRgbFromHex(hex);
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  const to = (n: number) => n.toString(16).padStart(2, '0');
  if (!rgb) {
    return `#9ca3af${to(a)}`;
  }
  return `#${to(rgb.r)}${to(rgb.g)}${to(rgb.b)}${to(a)}`;
}

export function isDarkSurfaceColor(theme: Colors): boolean {
  const L = relativeLuminanceFromHex(theme.background.primary);
  return L !== null && L < 0.12;
}

export function folderChipActiveForeground(theme: Colors, folderHex: string): string {
  const L = relativeLuminanceFromHex(folderHex);
  if (L === null) return theme.icon.onAccent;
  return L > 0.55 ? theme.text.primary : theme.icon.onAccent;
}
