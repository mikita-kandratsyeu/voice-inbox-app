import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { recordRepository } from '@/entities/record/model/repository';
import {
  generateEmbedding,
  getEmbeddingLanguage,
  isEmbeddingAvailable,
  prepareEmbeddingModel,
} from '@/shared/lib/embeddings';

import { buildEmbeddingText } from './buildEmbeddingText';

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

  const language = getEmbeddingLanguage();
  await prepareEmbeddingModel(language);

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
      const embedding = await generateEmbedding(text, language);
      if (embedding) {
        await recordRepository.updateEmbedding(record.id, embedding);
        useRecordStore.getState().setEmbedding(record.id, embedding);
        result.updated += 1;
      } else {
        result.skipped += 1;
      }
    } catch {
      result.failed += 1;
    }
  }

  return result;
}
