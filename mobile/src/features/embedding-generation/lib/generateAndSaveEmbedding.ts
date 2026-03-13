import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { recordRepository } from '@/entities/record/model/repository';
import { i18n } from '@/shared/lib';
import {
  generateEmbedding,
  isEmbeddingAvailable,
  prepareEmbeddingModel,
} from '@/shared/lib/embeddings';

import { buildEmbeddingText } from './buildEmbeddingText';

function getEmbeddingLanguage(): string {
  const lang = i18n.language ?? 'en';
  return lang.startsWith('ru') ? 'ru' : 'en';
}

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
