import { Share } from 'react-native';

import { NitroFS } from '@/shared/lib/fs';

import { writeShareMarkdownPdf } from './writeShareMarkdownPdf';

export type ShareMarkdownAsPdfInput = {
  markdown: string;
  fileNameWithoutExtension: string;
  /** Passed to `Share.share` as `title` (same as batch export file name). */
  shareTitle: string;
};

async function unlinkIfExists(path: string): Promise<void> {
  try {
    if (await NitroFS.exists(path)) {
      await NitroFS.unlink(path);
    }
  } catch {
    if (__DEV__) console.warn('[share] unlink failed', path);
  }
}

/** Generate markdown PDF and open the system share sheet (batch export path). */
export async function shareMarkdownAsPdf(input: ShareMarkdownAsPdfInput): Promise<void> {
  let pdfPath: string | undefined;

  try {
    pdfPath = await writeShareMarkdownPdf(input.markdown, input.fileNameWithoutExtension);
    await Share.share({
      url: pdfPath.startsWith('file://') ? pdfPath : `file://${pdfPath}`,
      title: input.shareTitle,
    });
  } finally {
    if (pdfPath) {
      await unlinkIfExists(pdfPath);
    }
  }
}
