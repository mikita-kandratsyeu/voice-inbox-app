import { recognizeText, type TextRecognitionResult } from '@dariyd/react-native-text-recognition';
import { NativeModules } from 'react-native';

import { diagWarn } from '@/shared/lib/appLogger';

import { type PdfExtractProgress, subscribeToPdfExtractProgress } from './pdfExtractProgress';
import { MAX_PDF_IMPORT_PAGES } from './pdfImportLimits';

const { AudioConverter } = NativeModules;

type NativePdfPayload = {
  apiVersion?: number;
  text?: string;
  stats?: Record<string, unknown>;
};

export type PdfExtractProgressCallback = (progress: PdfExtractProgress) => void;

function toFileUri(path: string): string {
  const trimmed = path.trim();
  return trimmed.startsWith('file://') ? trimmed : `file://${trimmed}`;
}

function languagesForHint(language?: string | null): string[] {
  const normalized = language?.trim().toLowerCase() ?? '';
  if (normalized.startsWith('ru')) return ['ru-RU', 'en-US'];
  if (normalized.startsWith('en')) return ['en-US', 'ru-RU'];
  return ['ru-RU', 'en-US'];
}

function aggregateRecognizedText(result: TextRecognitionResult): {
  text: string;
  nonEmptyPages: number;
} {
  const pageTexts = (result.pages ?? [])
    .map((page) => page.fullText?.trim() ?? '')
    .filter((text) => text.length > 0);
  const text = (result.fullText?.trim() || pageTexts.join('\n\n')).trim();
  return { text, nonEmptyPages: pageTexts.length };
}

async function extractPdfTextWithLibrary(
  fileUri: string,
  language: string | null,
  variant: 'default' | 'preprocess',
): Promise<string | null> {
  const options =
    variant === 'preprocess'
      ? {
          languages: languagesForHint(language),
          recognitionLevel: 'line' as const,
          maxPages: MAX_PDF_IMPORT_PAGES,
          pdfDpi: 400,
          preprocessImages: true,
        }
      : {
          languages: [] as string[],
          recognitionLevel: 'line' as const,
          maxPages: MAX_PDF_IMPORT_PAGES,
          pdfDpi: 400,
        };

  const result = await recognizeText(fileUri, options);
  const aggregated = aggregateRecognizedText(result);

  if (result.success && aggregated.text.length > 0) {
    return aggregated.text;
  }
  return null;
}

async function extractPdfTextWithNativeV2(
  fileUri: string,
  language: string | null,
): Promise<string | null> {
  const extractor = AudioConverter?.extractPdfTextV2 as
    | ((path: string, lang: string | null) => Promise<NativePdfPayload>)
    | undefined;
  if (!extractor) {
    return null;
  }

  try {
    const result = await extractor(fileUri, language);
    const text = result?.text?.trim() ?? '';
    return text.length > 0 ? text : null;
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    diagWarn('[extractPdfText] native v2 error:', err?.message ?? String(e), '| code:', err?.code);
    return null;
  }
}

export async function extractPdfText(
  inputPath: string,
  language?: string | null,
  onProgress?: PdfExtractProgressCallback,
): Promise<string | null> {
  const inArg = inputPath.trim();
  const languageArg = language?.trim() || null;
  const fileUri = toFileUri(inArg);
  const unsubscribe = onProgress ? subscribeToPdfExtractProgress(onProgress) : () => {};

  try {
    try {
      const libraryDefault = await extractPdfTextWithLibrary(fileUri, languageArg, 'default');
      if (libraryDefault) return libraryDefault;
    } catch (e: unknown) {
      diagWarn('[extractPdfText] text-recognition default error:', e);
    }

    try {
      const libraryPreprocess = await extractPdfTextWithLibrary(fileUri, languageArg, 'preprocess');
      if (libraryPreprocess) return libraryPreprocess;
    } catch (e: unknown) {
      diagWarn('[extractPdfText] text-recognition preprocess error:', e);
    }

    return extractPdfTextWithNativeV2(fileUri, languageArg);
  } finally {
    unsubscribe();
  }
}
