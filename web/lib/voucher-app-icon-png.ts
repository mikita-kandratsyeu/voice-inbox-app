import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getServerSharp } from '@/lib/server-sharp';

const iconCache = new Map<number, Buffer>();

/** Rasterized `/public/app-icon.svg` (same asset as the web header/footer). */
export async function loadVoucherAppIconPng(sizePx: number): Promise<Buffer> {
  const cached = iconCache.get(sizePx);
  if (cached) return cached;

  const libDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(process.cwd(), 'public/app-icon.svg'),
    path.join(process.cwd(), 'web/public/app-icon.svg'),
    path.join(libDir, '../public/app-icon.svg'),
  ];
  let svgPath: string | null = null;
  for (const p of candidates) {
    try {
      await fs.access(p);
      svgPath = p;
      break;
    } catch {
      /* try next */
    }
  }
  if (!svgPath) throw new Error('app-icon.svg not found');
  const svg = await fs.readFile(svgPath);
  const sharp = await getServerSharp();
  const png = await sharp(svg, { density: 150 })
    .resize(sizePx, sizePx, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  iconCache.set(sizePx, png);
  return png;
}
