import { useMemo } from 'react';

import type { WhisperModelId } from '../model/types';
import { getRecommendedWhisperModelId } from './recommendWhisperModel';

export const useRecommendedWhisperModelId = (): WhisperModelId =>
  useMemo(() => getRecommendedWhisperModelId(), []);
