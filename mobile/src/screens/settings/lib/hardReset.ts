import { IOS_DOCUMENT_PATH, IOS_LIBRARY_PATH } from '@op-engineering/op-sqlite';
import * as Keychain from 'react-native-keychain';

import {
  DEFAULT_APP_LOCK_GRACE_PERIOD_MS,
  DEFAULT_PIN_LENGTH,
} from '@/entities/app-lock/model/constants';
import { useAppLockStore } from '@/entities/app-lock/model/store';
import { useFolderStore } from '@/entities/folder/model/store';
import { useRecordStore } from '@/entities/record/model/store';
import { CLOUD_AI_KV_TTL_DEFAULT_SECONDS } from '@/entities/settings/lib/cloudAiKvTtl';
import { RECOMMENDED_AI_MODEL_ID } from '@/entities/settings/lib/recommendAiModel';
import {
  DEFAULT_SELECTED_WHISPER_MODEL_ID,
  DEFAULT_WHISPER_MODEL_WEIGHTS_FORMAT,
} from '@/entities/settings/model/constants';
import { useSettingsStore } from '@/entities/settings/model/store';
import { DEFAULT_ACCENT_COLOR_ID } from '@/shared/config';
import { storage } from '@/shared/lib/async-storage';
import { getDB } from '@/shared/lib/db/client';
import { foldersTable, recordsTable } from '@/shared/lib/db/schema';
import { getCachesDirectoryPath, getDocumentDirectoryPath, NitroFS } from '@/shared/lib/fs';

const APP_LOCK_PIN_SERVICE = 'voice-inbox-app-lock-pin';
const APP_LOCK_BIO_SERVICE = 'voice-inbox-app-lock-biometric';
const DEVICE_ID_SERVICE = 'voice-inbox-device-id';
const DB_NAME = 'voice-inbox.db';

async function removePathRecursive(path: string): Promise<void> {
  const exists = await NitroFS.exists(path);
  if (!exists) return;

  const stat = await NitroFS.stat(path);
  if (stat.isFile) {
    await NitroFS.unlink(path).catch(() => {});
    return;
  }

  const items = await NitroFS.readdir(path);
  for (const item of items) {
    await removePathRecursive(item.path);
  }
  await NitroFS.unlink(path).catch(() => {});
}

async function clearDatabaseData(): Promise<void> {
  try {
    const db = getDB();
    await db.delete(recordsTable);
    await db.delete(foldersTable);
  } catch {
    // DB may not be initialized yet; continue with file cleanup.
  }

  const docBase = (IOS_DOCUMENT_PATH ?? getDocumentDirectoryPath()).replace(/\/$/, '');
  const libBase = IOS_LIBRARY_PATH ? String(IOS_LIBRARY_PATH).replace(/\/$/, '') : null;
  const candidates = [
    `${docBase}/${DB_NAME}`,
    `${docBase}/${DB_NAME}-shm`,
    `${docBase}/${DB_NAME}-wal`,
    ...(libBase
      ? [`${libBase}/${DB_NAME}`, `${libBase}/${DB_NAME}-shm`, `${libBase}/${DB_NAME}-wal`]
      : []),
  ];

  for (const path of candidates) {
    const exists = await NitroFS.exists(path);
    if (exists) {
      await NitroFS.unlink(path).catch(() => {});
    }
  }
}

async function clearKeychainData(): Promise<void> {
  await Keychain.resetGenericPassword().catch(() => {});
  await Keychain.resetGenericPassword({ service: APP_LOCK_PIN_SERVICE }).catch(() => {});
  await Keychain.resetGenericPassword({ service: APP_LOCK_BIO_SERVICE }).catch(() => {});
  await Keychain.resetGenericPassword({ service: DEVICE_ID_SERVICE }).catch(() => {});
}

export async function performHardReset(): Promise<void> {
  await clearDatabaseData();
  await clearKeychainData();

  const docRoot = getDocumentDirectoryPath();
  const cacheRoot = getCachesDirectoryPath();
  await removePathRecursive(`${docRoot}/recordings`);
  await removePathRecursive(`${docRoot}/whisper-models`);
  await removePathRecursive(`${docRoot}/argmax-models`);
  await removePathRecursive(`${docRoot}/local-llm-models`);
  await removePathRecursive(`${docRoot}/transcription-checkpoints`);
  await removePathRecursive(cacheRoot);

  storage.clearAll();

  useRecordStore.setState({ records: [], hasActiveAiJobs: false, isLoaded: false });
  useFolderStore.setState({ folders: [], activeFolderId: null, isLoaded: false });
  useAppLockStore.setState({
    isEnabled: false,
    useBiometrics: false,
    isLocked: false,
    pinLength: DEFAULT_PIN_LENGTH,
    lockGracePeriodMs: DEFAULT_APP_LOCK_GRACE_PERIOD_MS,
    biometryType: null,
  });
  useSettingsStore.setState({
    appTheme: 'system',
    accentColorId: DEFAULT_ACCENT_COLOR_ID,
    appLanguage: 'system',
    selectedAIModel: RECOMMENDED_AI_MODEL_ID,
    aiModelRoutingMode: 'auto',
    selectedWhisperModel: DEFAULT_SELECTED_WHISPER_MODEL_ID,
    selectedWhisperModelFormat: DEFAULT_WHISPER_MODEL_WEIGHTS_FORMAT,
    whisperModelWeightsFormat: DEFAULT_WHISPER_MODEL_WEIGHTS_FORMAT,
    transcriptionLanguage: 'auto',
    transcriptionQualityMode: 'balanced',
    summaryStyle: 'standard',
    taskStrictness: 'balanced',
    aiOutputLanguage: 'same',
    cloudAiKvTtlSeconds: CLOUD_AI_KV_TTL_DEFAULT_SECONDS,
    showSummaryReasoningInNotes: true,
    autoTranscribeOnSave: false,
    autoAiAfterTranscription: false,
    whisperModelStatuses: {},
    whisperDownloadProgress: {},
    whisperDownloadBytes: {},
    whisperDownloadPhase: {},
    selectedLocalAiModel: null,
    localLlmModelStatuses: {},
    localLlmDownloadProgress: {},
    localLlmDownloadBytes: {},
  });
}
