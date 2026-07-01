import { generatePDF } from 'react-native-html-to-pdf';

import { getCachesDirectoryPath } from '@/shared/lib/fs';

import { shareMarkdownToHtmlDocument } from './shareMarkdownToHtml';

/** A4 width/height in PDF points (72 pt per inch). */
const PDF_A4_WIDTH_PT = 595;
const PDF_A4_HEIGHT_PT = 842;

export async function writeShareMarkdownPdf(
  markdown: string,
  fileNameWithoutExtension: string,
): Promise<string> {
  const html = shareMarkdownToHtmlDocument(markdown, fileNameWithoutExtension, {
    generatedAt: new Date(),
  });
  const cacheDir = getCachesDirectoryPath();

  const result = await generatePDF({
    html,
    fileName: fileNameWithoutExtension.replace(/\.pdf$/i, ''),
    directory: cacheDir,
    width: PDF_A4_WIDTH_PT,
    height: PDF_A4_HEIGHT_PT,
    padding: 28,
    bgColor: '#FFFFFF',
    shouldPrintBackgrounds: true,
  });

  return result.filePath;
}
