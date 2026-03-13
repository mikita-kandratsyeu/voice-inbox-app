import { useCallback, useState } from 'react';

import { useRecordStore } from '@/entities/record';
import { postTranslate } from '@/shared/lib/ai-api/translateApi';

export function useTranslate(recordId: string) {
  const records = useRecordStore((s) => s.records);
  const updateTranslation = useRecordStore((s) => s.updateTranslation);
  const [isTranslating, setIsTranslating] = useState(false);

  const record = records.find((r) => r.id === recordId);
  const transcript = record?.transcript ?? '';

  const translate = useCallback(
    async (targetLanguage: string): Promise<boolean> => {
      if (!transcript.trim()) return false;

      setIsTranslating(true);
      try {
        const result = await postTranslate(transcript, targetLanguage);

        if (!result.ok) {
          if ('limitExceeded' in result && result.limitExceeded) {
            return false;
          }
          throw new Error('error' in result ? result.error : 'Translation failed');
        }

        await updateTranslation(recordId, result.translatedText, targetLanguage);
        return true;
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
