import type { RecordListItem, VoiceRecord } from '@/entities/record';
import {
  filterInboxAskCorpusRecords,
  type InboxAskRetrievalScope,
} from '@/features/inbox-ask-retrieval';
import { isEmbeddingAvailable } from '@/shared/lib/embeddings';

import { generateAndSaveEmbeddingForRecord } from './generateAndSaveEmbedding';

const MAX_INBOX_ASK_EMBEDDING_BACKFILL = 20;

export async function ensureInboxAskEmbeddings(
  records: Array<VoiceRecord | RecordListItem>,
  embeddingsById: Map<string, number[]>,
  scope?: InboxAskRetrievalScope,
): Promise<void> {
  if (!isEmbeddingAvailable()) return;

  const corpus = filterInboxAskCorpusRecords(records, scope);
  const missing = corpus
    .filter((record) => !embeddingsById.has(record.id))
    .slice(0, MAX_INBOX_ASK_EMBEDDING_BACKFILL);

  for (const record of missing) {
    await generateAndSaveEmbeddingForRecord(record as VoiceRecord);
  }
}
