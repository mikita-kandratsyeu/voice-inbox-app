import { useMemo } from 'react';

import { useSettingsStore } from '../model/store';
import type { WhisperModelId } from '../model/types';
import { getRecommendedWhisperModelId } from './recommendWhisperModel';

export const useRecommendedWhisperModelId = (): WhisperModelId => {
  const whisperModelWeightsFormat = useSettingsStore((s) => s.whisperModelWeightsFormat);
  return useMemo(
    () => getRecommendedWhisperModelId(whisperModelWeightsFormat),
    [whisperModelWeightsFormat],
  );
};
