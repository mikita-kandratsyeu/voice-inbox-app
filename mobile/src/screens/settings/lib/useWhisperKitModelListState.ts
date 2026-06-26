import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import type { WhisperModelId } from '@/entities/settings';
import { WHISPER_MODELS } from '@/entities/settings';
import { getWhisperKitModelStorageBytes, isWhisperKitModelOnDisk } from '@/features/model-manager';
import { formatFileSize } from '@/shared/lib/whisper';

const IOS_WHISPER_KIT_MODEL_IDS = [
  'whisper-base',
  'whisper-small',
  'whisper-medium',
] as const satisfies readonly WhisperModelId[];

export const IOS_WHISPER_KIT_MODELS = WHISPER_MODELS.filter((model) =>
  (IOS_WHISPER_KIT_MODEL_IDS as readonly WhisperModelId[]).includes(model.id),
);

export const useWhisperKitModelListState = () => {
  const [kitDownloaded, setKitDownloaded] = useState<Partial<Record<WhisperModelId, boolean>>>({});
  const [kitDisplaySizes, setKitDisplaySizes] = useState<Partial<Record<WhisperModelId, string>>>(
    {},
  );

  const refreshKitModelState = useCallback(async () => {
    const entries = await Promise.all(
      IOS_WHISPER_KIT_MODEL_IDS.map(async (modelId) => {
        const downloaded = await isWhisperKitModelOnDisk(modelId);
        const bytes = downloaded ? await getWhisperKitModelStorageBytes(modelId) : 0;
        const model = WHISPER_MODELS.find((entry) => entry.id === modelId);
        return [
          modelId,
          {
            downloaded,
            displaySize: bytes > 0 ? formatFileSize(bytes) : (model?.sizeLabel ?? ''),
          },
        ] as const;
      }),
    );

    setKitDownloaded(Object.fromEntries(entries.map(([id, state]) => [id, state.downloaded])));
    setKitDisplaySizes(Object.fromEntries(entries.map(([id, state]) => [id, state.displaySize])));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshKitModelState();
    }, [refreshKitModelState]),
  );

  return {
    kitDownloaded,
    kitDisplaySizes,
    refreshKitModelState,
  };
};
