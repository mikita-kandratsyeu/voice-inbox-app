import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** How long each tip stays visible during AI generation. */
export const AI_GENERATION_TIP_ROTATE_MS = 9_000;

export const CLOUD_AI_GENERATION_TIP_KEYS = [
  'aiGeneration.tips.background',
  'aiGeneration.tips.recordingMarks',
  'aiGeneration.tips.askAfterSummary',
  'aiGeneration.tips.regenerateAfterEdit',
  'aiGeneration.tips.tasksEditable',
  'aiGeneration.tips.transcribeFirst',
  'aiGeneration.tips.folders',
  'aiGeneration.tips.meetingDialogue',
] as const;

export const PRIVATE_AI_GENERATION_TIP_KEYS = [
  'aiGeneration.tips.privateKeepOpen',
  'aiGeneration.tips.privateBattery',
  'aiGeneration.tips.recordingMarks',
  'aiGeneration.tips.tasksEditable',
  'aiGeneration.tips.regenerateAfterEdit',
] as const;

export function useRotatingI18nTip(tipKeys: readonly string[]): string {
  const { t } = useTranslation();
  const [index, setIndex] = useState(() =>
    tipKeys.length > 0 ? Math.floor(Math.random() * tipKeys.length) : 0,
  );

  useEffect(() => {
    if (tipKeys.length <= 1) return;

    const id = setInterval(() => {
      setIndex((current) => (current + 1) % tipKeys.length);
    }, AI_GENERATION_TIP_ROTATE_MS);

    return () => clearInterval(id);
  }, [tipKeys]);

  const key = tipKeys[index];
  return key ? t(key) : '';
}
