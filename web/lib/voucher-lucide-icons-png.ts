import type { VoucherSidebarPerkIcon } from '@/lib/pro-license-voucher-copy';
import { getServerSharp } from '@/lib/server-sharp';

/** Brand-aligned strokes for color printing (matches web blue / indigo). */
export const VOUCHER_ICON_STROKE = {
  brand: '#2563EB',
  indigo: '#4F46E5',
  amber: '#D97706',
  rose: '#E11D48',
} as const;

const iconCache = new Map<string, Buffer>();

/** Raster multiplier — PNG is larger than PDF display size for crisp strokes. */
const ICON_RASTER_SCALE = 4;

/** Bump when perk SVG paths change (invalidates in-process cache). */
const PERK_ICON_CACHE_VERSION = 'v5';

function lucideSvg(paths: string, stroke: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" shape-rendering="geometricPrecision">${paths}</svg>`;
}

/** Uniform PDF display size (pt) for all sidebar perk icons. */
export const VOUCHER_PERK_ICON_DISPLAY_PT: Record<VoucherSidebarPerkIcon, number> = {
  zap: 10,
  brain: 10,
  cloud: 10,
};

async function rasterLucideIcon(cacheKey: string, svg: string, displayPx: number): Promise<Buffer> {
  const cacheId = `${cacheKey}:${displayPx}`;
  const cached = iconCache.get(cacheId);
  if (cached) return cached;

  const rasterPx = Math.max(Math.round(displayPx * ICON_RASTER_SCALE), 96);
  const sharp = await getServerSharp();
  const png = await sharp(Buffer.from(svg), { density: 300 })
    .resize(rasterPx, rasterPx, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  iconCache.set(cacheId, png);
  return png;
}

/** @see https://lucide.dev/icons/gift */
const LUCIDE_GIFT_SVG = lucideSvg(
  '<path d="M12 7v14"/><path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5"/><rect x="3" y="7" width="18" height="4" rx="1"/>',
  VOUCHER_ICON_STROKE.brand,
);

/** @see https://lucide.dev/icons/heart */
const LUCIDE_HEART_SVG = lucideSvg(
  '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.5 4.04 3 5.5l7 7Z"/>',
  VOUCHER_ICON_STROKE.rose,
);

/** Lucide Gift rasterized for voucher PDF. */
export function loadVoucherGiftIconPng(displayPx: number): Promise<Buffer> {
  return rasterLucideIcon('gift', LUCIDE_GIFT_SVG, displayPx);
}

/** Lucide Heart rasterized for voucher PDF sidebar. */
export function loadVoucherHeartIconPng(displayPx: number): Promise<Buffer> {
  return rasterLucideIcon('heart', LUCIDE_HEART_SVG, displayPx);
}

const LUCIDE_PERK_SVGS: Record<VoucherSidebarPerkIcon, string> = {
  zap: lucideSvg(
    '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    VOUCHER_ICON_STROKE.amber,
  ),
  cloud: lucideSvg(
    '<path d="M12 13v8"/><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m8 17 4-4 4 4"/>',
    VOUCHER_ICON_STROKE.brand,
  ),
  brain: lucideSvg(
    '<path d="M12 18V5"/><path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"/><path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"/><path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"/><path d="M18 18a4 4 0 0 0 2-7.464"/><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"/><path d="M6 18a4 4 0 0 1-2-7.464"/><path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"/>',
    VOUCHER_ICON_STROKE.indigo,
  ),
};

/** Lucide perk icons for voucher sidebar (zap / brain / cloud-upload). */
export function loadVoucherPerkIconPng(
  kind: VoucherSidebarPerkIcon,
  displayPx: number = VOUCHER_PERK_ICON_DISPLAY_PT[kind],
): Promise<Buffer> {
  return rasterLucideIcon(
    `perk-${kind}:${PERK_ICON_CACHE_VERSION}`,
    LUCIDE_PERK_SVGS[kind],
    displayPx,
  );
}
