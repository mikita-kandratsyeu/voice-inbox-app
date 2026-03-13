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

export async function generateAndSaveEmbeddingForRecord(record: VoiceRecord): Promise<void> {
  if (!isEmbeddingAvailable()) return;

  const text = buildEmbeddingText(record);
  if (!text.trim()) return;

  const language = getEmbeddingLanguage();

  try {
    await prepareEmbeddingModel(language);
    const embedding = await generateEmbedding(text, language);
    if (embedding) {
      await recordRepository.updateEmbedding(record.id, embedding);
      useRecordStore.getState().setEmbedding(record.id, embedding);
    }
  } catch (err) {
    if (__DEV__) console.warn('[embedding-generation] Failed:', err);
  }
}
