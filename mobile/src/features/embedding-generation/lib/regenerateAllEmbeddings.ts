import type { VoiceRecord } from '@/entities/record';
import { isEmbeddingAvailable } from '@/shared/lib/embeddings';

import { buildEmbeddingText } from './buildEmbeddingText';
import { generateAndSaveEmbeddingForRecord } from './generateAndSaveEmbedding';

export type RegenerateResult = {
  updated: number;
  skipped: number;
  failed: number;
};

export async function regenerateAllEmbeddings(
  records: VoiceRecord[],
  onProgress?: (current: number, total: number) => void,
): Promise<RegenerateResult> {
  const result: RegenerateResult = { updated: 0, skipped: 0, failed: 0 };
  if (!isEmbeddingAvailable()) return result;

  const total = records.length;
  for (let i = 0; i < records.length; i++) {
    onProgress?.(i + 1, total);
    const record = records[i];
    const text = buildEmbeddingText(record).trim();

    if (!text) {
      result.skipped += 1;
      continue;
    }

    try {
      await generateAndSaveEmbeddingForRecord(record);
      result.updated += 1;
    } catch {
      result.failed += 1;
    }
  }

  return result;
}
