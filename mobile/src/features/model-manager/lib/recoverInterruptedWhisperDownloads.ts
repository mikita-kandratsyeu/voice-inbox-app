import type {
  WhisperModelId,
  WhisperModelStatus,
  WhisperModelVariantId,
  WhisperModelWeightsFormat,
} from '@/entities/settings/model/types';
import { WHISPER_KIT_STORAGE_FORMAT } from '@/entities/settings/model/constants';
import { diagWarn } from '@/shared/lib/appLogger';
import { storage } from '@/shared/lib/async-storage';

import { deleteWhisperModel } from './deleteWhisperModel';
import { deleteWhisperKitModel } from './whisperKitModelStorage';
import { stopWhisperDownloadLiveActivity } from './downloadLiveActivity';

const WHISPER_STATUSES_STORAGE_KEY = 'settings.whisperStatuses';

const recoverInterruptedWhisperDownloads = (): void => {
  try {
    const raw = storage.getString(WHISPER_STATUSES_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as Partial<Record<WhisperModelVariantId, WhisperModelStatus>>;
    const interrupted: WhisperModelVariantId[] = [];
    const next: Partial<Record<WhisperModelVariantId, WhisperModelStatus>> = { ...parsed };

    for (const id of Object.keys(next) as WhisperModelVariantId[]) {
      if (next[id] === 'downloading') {
        next[id] = 'not_downloaded';
        interrupted.push(id);
      }
    }

    if (interrupted.length === 0) {
      return;
    }

    storage.set(WHISPER_STATUSES_STORAGE_KEY, JSON.stringify(next));

    queueMicrotask(() => {
      void stopWhisperDownloadLiveActivity().catch(() => {});
      void Promise.all(
        interrupted.map((variantId) => {
          const separatorIndex = variantId.lastIndexOf(':');
          const modelId = variantId.slice(0, separatorIndex) as WhisperModelId;
          const format = variantId.slice(separatorIndex + 1);
          if (format === WHISPER_KIT_STORAGE_FORMAT) {
            return deleteWhisperKitModel(modelId);
          }
          return deleteWhisperModel(modelId, format as WhisperModelWeightsFormat);
        }),
      ).catch(() => {});
    });
  } catch {
    diagWarn('[whisper] Failed to recover interrupted downloads');
  }
};

recoverInterruptedWhisperDownloads();
