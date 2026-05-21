import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const iconCache = new Map<number, Buffer>();

/** Rasterized `/public/app-icon.svg` (same asset as the web header/footer). */
export async function loadVoucherAppIconPng(sizePx: number): Promise<Buffer> {
  const cached = iconCache.get(sizePx);
  if (cached) return cached;

  const libDir = path.dirname(fileURLToPath(import.meta.url));
  const svgPath = path.join(libDir, '../public/app-icon.svg');
  const svg = await fs.readFile(svgPath);
  const png = await sharp(svg, { density: 150 })
    .resize(sizePx, sizePx, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  iconCache.set(sizePx, png);
  return png;
}
