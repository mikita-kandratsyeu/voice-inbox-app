import type {
  WhisperModelStatus,
  WhisperModelVariantId,
  WhisperModelWeightsFormat,
} from '@/entities/settings/model/types';
import { storage } from '@/shared/lib/async-storage';

import { deleteWhisperModel } from './deleteWhisperModel';
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
          const [modelId, format] = variantId.split(':');
          return deleteWhisperModel(
            modelId as Parameters<typeof deleteWhisperModel>[0],
            format as WhisperModelWeightsFormat,
          );
        }),
      ).catch(() => {});
    });
  } catch {
    if (__DEV__) {
      console.warn('[whisper] Failed to recover interrupted downloads');
    }
  }
};

recoverInterruptedWhisperDownloads();
