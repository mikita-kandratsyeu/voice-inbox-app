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
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Linking, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SettingsStackParamList } from '@/app/navigation/types';
import { useAppLockStore } from '@/entities/app-lock';
import { useRecordStore } from '@/entities/record';
import { AI_MODELS, useSettingsStore, WHISPER_MODELS } from '@/entities/settings';
import { exportData, importData } from '@/features/sync-data';
import { getColors } from '@/shared/config';
import { SettingsRow, SettingsSection } from '@/shared/ui';

export const SettingsScreen = () => {
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
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
      Alert.alert('Ошибка', 'Не удалось экспортировать данные');
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
          Alert.alert('Ошибка', result.error);
        }
        return;
      }
      Alert.alert(
        'Импорт данных',
        `Найдено ${result.records.length} записей. Импортировать? Существующие данные не будут удалены.`,
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Импортировать',
            onPress: async () => {
              for (const record of result.records) {
                try {
                  await addRecord(record);
                } catch {
                  Alert.alert('Ошибка', 'Не удалось импортировать запись');
                  return;
                }
              }
              Alert.alert('Готово', `Импортировано ${result.records.length} записей`);
            },
          },
        ],
      );
    } catch {
      Alert.alert('Ошибка', 'Не удалось импортировать данные');
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
          Настройки
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
        <SettingsSection title="Синхронизация" color={color}>
          <SettingsRow
            label={isExporting ? 'Экспорт...' : 'Экспорт данных'}
            value={`${records.length} записей`}
            color={color}
            leftIcon={<UploadCloud size={20} color={color.accent.primary} strokeWidth={1.8} />}
            onPress={handleExport}
            isFirst
          />
          <SettingsRow
            label={isImporting ? 'Импорт...' : 'Импорт данных'}
            color={color}
            leftIcon={<Download size={20} color={color.accent.primary} strokeWidth={1.8} />}
            onPress={handleImport}
            isLast
          />
        </SettingsSection>

        <SettingsSection title="ИИ обработка" color={color}>
          <SettingsRow
            label="ИИ модель"
            value={aiModelName}
            color={color}
            leftIcon={<Bot size={20} color={color.accent.transcript} strokeWidth={1.8} />}
            onPress={() => navigation.navigate('AIModelPicker')}
            isFirst
          />
          <SettingsRow
            label="Транскрипция"
            value={`Whisper ${whisperModelName}`}
            color={color}
            leftIcon={<Mic size={20} color={color.accent.cache} strokeWidth={1.8} />}
            onPress={() => navigation.navigate('WhisperModelPicker')}
            isLast
          />
        </SettingsSection>

        <SettingsSection title="Устройство" color={color}>
          <SettingsRow
            label="Блокировка приложения"
            value={isAppLockEnabled ? 'Вкл' : 'Выкл'}
            color={color}
            leftIcon={<Fingerprint size={20} color={color.accent.primary} strokeWidth={1.8} />}
            onPress={() => navigation.navigate('AppLockSetup')}
            isFirst
          />
          <SettingsRow
            label="Офлайн хранилище"
            color={color}
            leftIcon={<HardDrive size={20} color={color.accent.success} strokeWidth={1.8} />}
            onPress={() => navigation.navigate('StorageDetails')}
            isLast
          />
        </SettingsSection>

        <SettingsSection title="Конфиденциальность" color={color}>
          <SettingsRow
            label="Политика конфиденциальности"
            color={color}
            leftIcon={<Shield size={20} color={color.icon.muted} strokeWidth={1.8} />}
            onPress={() => Linking.openURL('https://voice-inbox.app/privacy')}
            isFirst
          />
          <SettingsRow
            label="О приложении"
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
