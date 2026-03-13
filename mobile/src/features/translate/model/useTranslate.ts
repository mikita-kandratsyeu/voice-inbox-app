import { useCallback, useState } from 'react';

import { useRecordStore } from '@/entities/record';
import { postTranslate } from '@/shared/lib/ai-api/translateApi';

export type TranslateResult = { ok: true } | { ok: false; error: 'limit' | 'network' };

export function useTranslate(recordId: string) {
  const records = useRecordStore((s) => s.records);
  const updateTranslation = useRecordStore((s) => s.updateTranslation);
  const [isTranslating, setIsTranslating] = useState(false);

  const record = records.find((r) => r.id === recordId);
  const transcript = record?.transcript ?? '';

  const translate = useCallback(
    async (targetLanguage: string): Promise<TranslateResult> => {
      if (!transcript.trim()) return { ok: false, error: 'network' };

      setIsTranslating(true);
      try {
        const result = await postTranslate(transcript, targetLanguage);

        if (!result.ok) {
          if ('limitExceeded' in result && result.limitExceeded) {
            return { ok: false, error: 'limit' };
          }

          return { ok: false, error: 'network' };
        }

        await updateTranslation(recordId, result.translatedText, targetLanguage);
        return { ok: true };
      } catch {
        return { ok: false, error: 'network' };
      } finally {
        setIsTranslating(false);
      }
    },
    [recordId, transcript, updateTranslation],
  );

  return {
    translate,
    isTranslating,
    hasTranscript: transcript.length > 0,
  };
}
