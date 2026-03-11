import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Bot,
  Download,
  Fingerprint,
  HardDrive,
  Info,
  Mic,
  Shield,
  UploadCloud,
  Zap,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, ScrollView, Switch, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SettingsStackParamList } from '@/app/navigation/types';
import { useAppLockStore } from '@/entities/app-lock';
import { useRecordStore } from '@/entities/record';
import { AI_MODELS, useSettingsStore, WHISPER_MODELS } from '@/entities/settings';
import { exportData, importData } from '@/features/sync-data';
import { getColors, WEBSITE_URL } from '@/shared/config';
import { SettingsRow, SettingsSection } from '@/shared/ui';

export const SettingsScreen = () => {
  const { t } = useTranslation();
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const autoTranscribeOnSave = useSettingsStore((s) => s.autoTranscribeOnSave);
  const setAutoTranscribeOnSave = useSettingsStore((s) => s.setAutoTranscribeOnSave);
  const isAppLockEnabled = useAppLockStore((s) => s.isEnabled);
  const records = useRecordStore((s) => s.records);
  const addRecord = useRecordStore((s) => s.addRecord);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const aiModelName = AI_MODELS.find((m) => m.id === selectedAIModel)?.name ?? selectedAIModel;
  const whisperModelName =
    WHISPER_MODELS.find((m) => m.id === selectedWhisperModel)?.name ?? selectedWhisperModel;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportData(records);
    } catch {
      Alert.alert(t('common.error'), t('importExport.exportError'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      setIsImporting(true);
      const result = await importData();
      if (!result.success) {
        if (result.error !== 'cancelled') {
          Alert.alert(t('common.error'), result.error);
        }
        return;
      }
      Alert.alert(
        t('importExport.importTitle'),
        t('importExport.importConfirm', { count: result.records.length }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('importExport.import'),
            onPress: async () => {
              for (const record of result.records) {
                try {
                  await addRecord(record);
                } catch {
                  Alert.alert(t('common.error'), t('importExport.importRecordError'));
                  return;
                }
              }
              Alert.alert(
                t('common.done'),
                t('importExport.importSuccess', { count: result.records.length }),
              );
            },
          },
        ],
      );
    } catch {
      Alert.alert(t('common.error'), t('importExport.importError'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <View
        className="px-4 pb-3"
        style={{
          backgroundColor: color.background.primary,
          borderBottomWidth: 1,
          borderBottomColor: color.border.default,
          paddingTop: insets.top + 16,
        }}
      >
        <Text className="text-2xl font-bold" style={{ color: color.text.primary }}>
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title={t('settings.sync')} color={color}>
          <SettingsRow
            label={isExporting ? t('settings.exporting') : t('settings.export')}
            value={t('inbox.recordsCount', { count: records.length })}
            color={color}
            leftIcon={<UploadCloud size={20} color={color.accent.primary} strokeWidth={1.8} />}
            onPress={handleExport}
            isFirst
          />
          <SettingsRow
            label={isImporting ? t('settings.importing') : t('settings.import')}
            color={color}
            leftIcon={<Download size={20} color={color.accent.primary} strokeWidth={1.8} />}
            onPress={handleImport}
            isLast
          />
        </SettingsSection>

        <SettingsSection title={t('settings.aiProcessing')} color={color}>
          <SettingsRow
            label={t('settings.aiModel')}
            value={aiModelName}
            color={color}
            leftIcon={<Bot size={20} color={color.accent.transcript} strokeWidth={1.8} />}
            onPress={() => navigation.navigate('AIModelPicker')}
            isFirst
          />
          <SettingsRow
            label={t('settings.transcription')}
            value={`Whisper ${whisperModelName}`}
            color={color}
            leftIcon={<Mic size={20} color={color.accent.cache} strokeWidth={1.8} />}
            onPress={() => navigation.navigate('WhisperModelPicker')}
          />
          <SettingsRow
            label={t('settings.autoTranscribeOnSave')}
            color={color}
            leftIcon={<Zap size={20} color={color.accent.transcript} strokeWidth={1.8} />}
            rightSlot={
              <Switch
                value={autoTranscribeOnSave}
                onValueChange={setAutoTranscribeOnSave}
                trackColor={{
                  false: color.background.tertiary,
                  true: color.accent.success,
                }}
                thumbColor="#fff"
              />
            }
            showChevron={false}
            onPress={undefined}
            isLast
          />
        </SettingsSection>

        <SettingsSection title={t('settings.device')} color={color}>
          <SettingsRow
            label={t('settings.appLock')}
            value={isAppLockEnabled ? t('settings.on') : t('settings.off')}
            color={color}
            leftIcon={<Fingerprint size={20} color={color.accent.primary} strokeWidth={1.8} />}
            onPress={() => navigation.navigate('AppLockSetup')}
            isFirst
          />
          <SettingsRow
            label={t('settings.offlineStorage')}
            color={color}
            leftIcon={<HardDrive size={20} color={color.accent.success} strokeWidth={1.8} />}
            onPress={() => navigation.navigate('StorageDetails')}
            isLast
          />
        </SettingsSection>

        <SettingsSection title={t('settings.privacy')} color={color}>
          <SettingsRow
            label={t('settings.privacyPolicy')}
            color={color}
            leftIcon={<Shield size={20} color={color.icon.muted} strokeWidth={1.8} />}
            onPress={() => Linking.openURL(`${WEBSITE_URL}/privacy`)}
            isFirst
          />
          <SettingsRow
            label={t('settings.about')}
            color={color}
            leftIcon={<Info size={20} color={color.icon.muted} strokeWidth={1.8} />}
            onPress={() => navigation.navigate('AboutApp')}
            isLast
          />
        </SettingsSection>
      </ScrollView>
    </View>
  );
};
