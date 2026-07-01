export const AUTO_ORGANIZE_FOLDER_COLOR_HEXES = [
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#c026d3',
  '#f43f5e',
  '#ea580c',
  '#d97706',
  '#10b981',
  '#06b6d4',
] as const;

export const DEFAULT_AUTO_ORGANIZE_FOLDER_COLOR: (typeof AUTO_ORGANIZE_FOLDER_COLOR_HEXES)[number] =
  '#3b82f6';

const CANON_LOWER = new Set(AUTO_ORGANIZE_FOLDER_COLOR_HEXES.map((h) => h.toLowerCase() as string));

const DARK_ALIASES: Record<string, string> = {
  '#e879f9': '#c026d3',
  '#fb923c': '#ea580c',
  '#fbbf24': '#d97706',
};

function parseRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace(/^#/, '');
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

function dist2(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

const CANON_TO_DARK_VARIANTS: Record<string, readonly string[]> = {
  '#c026d3': ['#e879f9'],
  '#ea580c': ['#fb923c'],
  '#d97706': ['#fbbf24'],
};

function nearestCanonHex(raw: string): (typeof AUTO_ORGANIZE_FOLDER_COLOR_HEXES)[number] {
  const rgb = parseRgb(raw);
  if (!rgb) return DEFAULT_AUTO_ORGANIZE_FOLDER_COLOR;

  let best: (typeof AUTO_ORGANIZE_FOLDER_COLOR_HEXES)[number] = DEFAULT_AUTO_ORGANIZE_FOLDER_COLOR;
  let bestD = Infinity;

  for (const canon of AUTO_ORGANIZE_FOLDER_COLOR_HEXES) {
    const toTry = [canon, ...(CANON_TO_DARK_VARIANTS[canon] ?? [])];
    for (const v of toTry) {
      const p = parseRgb(v);
      if (!p) continue;
      const d = dist2(rgb, p);
      if (d < bestD) {
        bestD = d;
        best = canon;
      }
    }
  }

  return best;
}

export function normalizeAutoOrganizeFolderColor(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return DEFAULT_AUTO_ORGANIZE_FOLDER_COLOR;
  if (CANON_LOWER.has(trimmed)) return trimmed;
  const alias = DARK_ALIASES[trimmed];
  if (alias) return alias;
  return nearestCanonHex(trimmed);
}

export function formatAutoOrganizeFolderColorsPromptBlock(): string {
  return AUTO_ORGANIZE_FOLDER_COLOR_HEXES.map((c) => `- ${c}`).join('\n');
}
