import { useEffect, useState } from 'react';

import { useSettingsStore } from '../model/store';
import type { WhisperModelId } from '../model/types';
import {
  checkAllModelsCompatibilityByFormat,
  type DeviceCompatibilityResult,
} from './canDeviceRunWhisperModel';

export type CompatibilityMap = Record<WhisperModelId, DeviceCompatibilityResult> | null;

export const useWhisperModelCompatibility = (): CompatibilityMap => {
  const [compatibility, setCompatibility] = useState<CompatibilityMap>(null);
  const whisperModelWeightsFormat = useSettingsStore((s) => s.whisperModelWeightsFormat);

  useEffect(() => {
    let cancelled = false;

    checkAllModelsCompatibilityByFormat(whisperModelWeightsFormat).then((result) => {
      if (!cancelled) {
        setCompatibility(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [whisperModelWeightsFormat]);

  return compatibility;
};
