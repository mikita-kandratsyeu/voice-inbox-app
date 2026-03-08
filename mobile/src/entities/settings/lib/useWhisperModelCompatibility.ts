import { useEffect, useState } from 'react';

import type { WhisperModelId } from '../model/types';
import {
  checkAllModelsCompatibility,
  type DeviceCompatibilityResult,
} from './canDeviceRunWhisperModel';

export type CompatibilityMap = Record<WhisperModelId, DeviceCompatibilityResult> | null;

export const useWhisperModelCompatibility = (): CompatibilityMap => {
  const [compatibility, setCompatibility] = useState<CompatibilityMap>(null);

  useEffect(() => {
    let cancelled = false;

    checkAllModelsCompatibility().then((result) => {
      if (!cancelled) {
        setCompatibility(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return compatibility;
};
