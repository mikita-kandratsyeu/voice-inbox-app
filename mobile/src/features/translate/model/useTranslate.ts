import { useCallback } from 'react';

import { useRecordStore } from '@/entities/record';
import { postTranslate } from '@/shared/lib/ai-api/translateApi';

export type TranslateResult = { ok: true } | { ok: false; error: 'limit' | 'network' };

export function useTranslate(recordId: string) {
  const records = useRecordStore((s) => s.records);
  const updateTranslation = useRecordStore((s) => s.updateTranslation);
  const setTranslationStatus = useRecordStore((s) => s.setTranslationStatus);

  const record = records.find((r) => r.id === recordId);
  const transcript = record?.transcript ?? '';
  const isTranslating = record?.translationStatus === 'processing';

  const translate = useCallback(
    async (targetLanguage: string): Promise<TranslateResult> => {
      if (!transcript.trim()) return { ok: false, error: 'network' };

      setTranslationStatus(recordId, 'processing');
      try {
        const result = await postTranslate(transcript, targetLanguage);

        if (!result.ok) {
          if ('limitExceeded' in result && result.limitExceeded) {
            setTranslationStatus(recordId, 'error');
            return { ok: false, error: 'limit' };
          }

          setTranslationStatus(recordId, 'error');
          return { ok: false, error: 'network' };
        }

        await updateTranslation(recordId, result.translatedText, targetLanguage);
        return { ok: true };
      } catch {
        setTranslationStatus(recordId, 'error');
        return { ok: false, error: 'network' };
      }
    },
    [recordId, setTranslationStatus, transcript, updateTranslation],
  );

  const clearTranslation = useCallback(async (): Promise<void> => {
    await updateTranslation(recordId, null, null);
  }, [recordId, updateTranslation]);

  return {
    translate,
    clearTranslation,
    isTranslating,
    hasTranscript: transcript.length > 0,
  };
}
