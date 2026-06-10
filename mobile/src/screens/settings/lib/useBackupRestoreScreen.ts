import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import type { SettingsStackParamList } from '@/app/navigation/types';
import { useFolderStore } from '@/entities/folder';
import { recordRepository } from '@/entities/record';
import {
  exportData,
  IMPORT_ERROR_WRONG_BACKUP_PASSWORD,
  importData,
  type ImportResult,
} from '@/features/sync-data';
import { useColors } from '@/shared/config';
import { diagWarn } from '@/shared/lib/appLogger';
import {
  getBackupEncryptExportEnabled,
  getBackupEncryptionNoticeAcknowledged,
  setBackupEncryptExportEnabled,
  setBackupEncryptionNoticeAcknowledged,
} from '@/shared/lib/backupExportPrefs';
import { getCachesDirectoryPath, NitroFS } from '@/shared/lib/fs';

import type { BackupPasswordSheetMode } from '../ui/BackupPasswordSheet';

export function useBackupRestoreScreen() {
  const { t } = useTranslation();
  const color = useColors();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupEncryptEnabled, setBackupEncryptEnabledState] = useState(
    getBackupEncryptExportEnabled,
  );
  const [backupNoticeSheetVisible, setBackupNoticeSheetVisible] = useState(false);
  const [backupPasswordSheetVisible, setBackupPasswordSheetVisible] = useState(false);
  const [backupPasswordSheetMode, setBackupPasswordSheetMode] =
    useState<BackupPasswordSheetMode>('export');
  const [pendingImportZipPath, setPendingImportZipPath] = useState<string | null>(null);
  const pendingEnableEncryptAfterNoticeRef = useRef(false);

  const releasePendingImportZip = useCallback(async (zipPath: string | null) => {
    if (!zipPath) return;
    const cache = getCachesDirectoryPath();
    if (!zipPath.startsWith(cache)) return;
    try {
      const exists = await NitroFS.exists(zipPath);
      if (exists) {
        await NitroFS.unlink(zipPath);
      }
    } catch {
      diagWarn('[releasePendingImportZip] failed', { path: zipPath });
    }
  }, []);

  const processImportResult = useCallback(
    (result: ImportResult) => {
      if (!result.success) {
        if ('needsPassword' in result) {
          setPendingImportZipPath(result.zipFsPath);
          setBackupPasswordSheetMode('import');
          setBackupPasswordSheetVisible(true);
          return;
        }
        if (result.error === 'cancelled') {
          void releasePendingImportZip(pendingImportZipPath);
          setPendingImportZipPath(null);
          return;
        }
        if (result.error === IMPORT_ERROR_WRONG_BACKUP_PASSWORD) {
          Alert.alert(t('common.error'), t('importExport.wrongBackupPassword'));
          return;
        }
        Alert.alert(t('common.error'), result.error);
        void releasePendingImportZip(pendingImportZipPath);
        setPendingImportZipPath(null);
        return;
      }
      void releasePendingImportZip(pendingImportZipPath);
      setPendingImportZipPath(null);
      navigation.navigate('ImportRecords', {
        records: result.records,
        folders: result.folders,
        legacyFolders: result.legacyFolders,
        graphLayouts: result.graphLayouts,
      });
    },
    [navigation, pendingImportZipPath, releasePendingImportZip, t],
  );

  const runExport = useCallback(
    async (password?: string) => {
      try {
        setIsExporting(true);
        const records = await recordRepository.getAll();
        const folderStore = useFolderStore.getState();
        if (!folderStore.isLoaded) {
          await folderStore.load();
        }
        const folders = useFolderStore.getState().folders;
        await exportData(records, folders, password ? { password } : undefined);
      } catch {
        Alert.alert(t('common.error'), t('importExport.exportError'));
      } finally {
        setIsExporting(false);
      }
    },
    [t],
  );

  const handleEncryptBackupChange = useCallback((value: boolean) => {
    if (!value) {
      setBackupEncryptEnabledState(false);
      setBackupEncryptExportEnabled(false);
      return;
    }
    if (!getBackupEncryptionNoticeAcknowledged()) {
      pendingEnableEncryptAfterNoticeRef.current = true;
      setBackupNoticeSheetVisible(true);
      return;
    }
    setBackupEncryptEnabledState(true);
    setBackupEncryptExportEnabled(true);
  }, []);

  const handleBackupNoticeAcknowledge = useCallback(() => {
    setBackupEncryptionNoticeAcknowledged();
    setBackupNoticeSheetVisible(false);
    if (pendingEnableEncryptAfterNoticeRef.current) {
      pendingEnableEncryptAfterNoticeRef.current = false;
      setBackupEncryptEnabledState(true);
      setBackupEncryptExportEnabled(true);
    }
  }, []);

  const handleBackupNoticeClose = useCallback(() => {
    pendingEnableEncryptAfterNoticeRef.current = false;
    setBackupNoticeSheetVisible(false);
  }, []);

  const handleBackupPasswordSheetClose = useCallback(() => {
    setBackupPasswordSheetVisible(false);
    if (backupPasswordSheetMode === 'import' && pendingImportZipPath) {
      void releasePendingImportZip(pendingImportZipPath);
      setPendingImportZipPath(null);
    }
  }, [backupPasswordSheetMode, pendingImportZipPath, releasePendingImportZip]);

  const handleBackupPasswordSubmit = useCallback(
    async (password: string) => {
      if (backupPasswordSheetMode === 'export') {
        setBackupPasswordSheetVisible(false);
        await runExport(password);
        return;
      }
      const zipPath = pendingImportZipPath;
      if (!zipPath) {
        setBackupPasswordSheetVisible(false);
        return;
      }
      try {
        setIsImporting(true);
        const result = await importData({ zipFsPath: zipPath, password });
        if (result.success) {
          setBackupPasswordSheetVisible(false);
        }
        processImportResult(result);
      } catch {
        Alert.alert(t('common.error'), t('importExport.importError'));
      } finally {
        setIsImporting(false);
      }
    },
    [backupPasswordSheetMode, pendingImportZipPath, processImportResult, runExport, t],
  );

  const handleExport = useCallback(() => {
    if (backupEncryptEnabled) {
      setBackupPasswordSheetMode('export');
      setBackupPasswordSheetVisible(true);
      return;
    }
    void runExport();
  }, [backupEncryptEnabled, runExport]);

  const handleImport = useCallback(async () => {
    setPendingImportZipPath(null);
    try {
      setIsImporting(true);
      const result = await importData();
      processImportResult(result);
    } catch {
      Alert.alert(t('common.error'), t('importExport.importError'));
    } finally {
      setIsImporting(false);
    }
  }, [processImportResult, t]);

  return {
    t,
    color,
    backupEncryptEnabled,
    handleEncryptBackupChange,
    backupNoticeSheetVisible,
    handleBackupNoticeAcknowledge,
    handleBackupNoticeClose,
    backupPasswordSheetVisible,
    backupPasswordSheetMode,
    handleBackupPasswordSheetClose,
    handleBackupPasswordSubmit,
    isExporting,
    isImporting,
    handleExport,
    handleImport,
  };
}
