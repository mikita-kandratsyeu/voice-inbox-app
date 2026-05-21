import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type PDFDocument from 'pdfkit';
import { getVoucherPdfDejaVuDir } from '@/lib/pro-license-voucher-copy';

const libDir = path.dirname(fileURLToPath(import.meta.url));

export type VoucherPdfFonts = { regular: string; bold: string };

/** Inter (OFL) — close to site Onest, full Latin + Cyrillic for print PDFs. */
function getBundledInterFontPaths(): { regular: string; bold: string } | null {
  const dir = path.join(libDir, '../assets/fonts/voucher');
  const regular = path.join(dir, 'Inter-Regular.ttf');
  const bold = path.join(dir, 'Inter-Bold.ttf');
  if (!fs.existsSync(regular) || !fs.existsSync(bold)) return null;
  return { regular, bold };
}

export function resolveVoucherPdfFonts(doc: InstanceType<typeof PDFDocument>): VoucherPdfFonts {
  const inter = getBundledInterFontPaths();
  if (inter) {
    doc.registerFont('VoucherSans', inter.regular);
    doc.registerFont('VoucherSans-Bold', inter.bold);
    return { regular: 'VoucherSans', bold: 'VoucherSans-Bold' };
  }

  const dir = getVoucherPdfDejaVuDir();
  doc.registerFont('VoucherSans', path.join(dir, 'DejaVuSans.ttf'));
  doc.registerFont('VoucherSans-Bold', path.join(dir, 'DejaVuSans-Bold.ttf'));
  return { regular: 'VoucherSans', bold: 'VoucherSans-Bold' };
}
