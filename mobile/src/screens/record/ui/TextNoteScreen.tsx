import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardController } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { useAiProcessing } from '@/features/ai-processing';
import { shouldApplyAutoAiAfterTranscription } from '@/features/app-storefront';
import { generateAndSaveEmbeddingForRecord } from '@/features/embedding-generation';
import { useProEntitlement } from '@/features/pro-license';
import { useColors } from '@/shared/config';
import { useNetworkStatus } from '@/shared/lib';
import { Button, getInputFieldInputStyle, InputField } from '@/shared/ui';

import { generateRecordId } from '../lib/generateRecordId';
import { getAutoTitle } from '../lib/getAutoTitle';

export const TextNoteScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const color = useColors();
  const addRecord = useRecordStore((s) => s.addRecord);
  const autoAiAfterTranscription = useSettingsStore((s) => s.autoAiAfterTranscription);
  const { isProActive } = useProEntitlement();
  const { isConnected } = useNetworkStatus();
  const { processRecord } = useAiProcessing();
  const [title, setTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const hasUnsavedChanges = title.trim().length > 0 || noteText.trim().length > 0;

  const canSave = noteText.trim().length > 0;

  const resolvedTitle = useMemo(() => {
    const trimmed = title.trim();

    if (trimmed.length > 0) {
      return trimmed;
    }

    return getAutoTitle();
  }, [title]);

  const handleBack = useCallback(() => {
    const close = () => {
      KeyboardController.dismiss({ animated: false });
      navigation.goBack();
    };

    if (!hasUnsavedChanges) {
      close();
      return;
    }

    Alert.alert(t('textNote.discardTitle'), t('textNote.discardMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('textNote.discardConfirm'),
        style: 'destructive',
        onPress: close,
      },
    ]);
  }, [hasUnsavedChanges, navigation, t]);

  const handleSave = useCallback(async () => {
    KeyboardController.dismiss({ animated: false });
    const transcript = noteText.trim();
    if (!transcript) {
      return;
    }

    const record: VoiceRecord = {
      id: generateRecordId(),
      title: resolvedTitle,
      transcript,
      transcriptSegments: [],
      summary: '',
      tasks: [],
      duration: '00:00',
      durationMs: 0,
      createdAt: new Date().toISOString(),
      status: 'unread',
      aiStatus: 'idle',
      transcriptProgress: 0,
      isPinned: false,
      tags: [],
      audioPath: '',
    };

    await addRecord(record);
    generateAndSaveEmbeddingForRecord(record).catch(() => {});

    if (shouldApplyAutoAiAfterTranscription(autoAiAfterTranscription, isProActive) && isConnected) {
      void processRecord(record).catch(() => {});
    }

    KeyboardController.dismiss({ animated: false });
    navigation.goBack();
  }, [
    addRecord,
    autoAiAfterTranscription,
    isConnected,
    isProActive,
    navigation,
    noteText,
    processRecord,
    resolvedTitle,
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: color.background.primary }}>
      <View
        className="flex-row items-center justify-between px-4 pb-3"
        style={{
          backgroundColor: color.background.primary,
          borderBottomWidth: 1,
          borderBottomColor: color.border.default,
          paddingTop: insets.top + 12,
        }}
      >
        <Button
          iconOnly
          variant="icon"
          size="md"
          icon={<X size={22} color={color.text.primary} strokeWidth={2.2} />}
          color={color}
          onPress={handleBack}
          accessibilityLabel={t('common.close')}
        />
        <Text
          className="flex-1 px-2 text-center text-[18px] font-semibold"
          style={{ color: color.text.primary }}
        >
          {t('textNote.title')}
        </Text>
        <Button
          iconOnly
          variant="icon"
          size="md"
          icon={<Check size={22} color={color.accent.primary} strokeWidth={2.5} />}
          color={color}
          onPress={handleSave}
          disabled={!canSave}
          accessibilityLabel={t('common.save')}
        />
      </View>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 16,
          paddingBottom: insets.bottom + 24,
          gap: 12,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={16}
      >
        <InputField color={color} hasValue={title.trim().length > 0}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('textNote.titlePlaceholder')}
            placeholderTextColor={color.text.secondary}
            style={getInputFieldInputStyle(color)}
            returnKeyType="next"
            accessibilityLabel={t('textNote.titlePlaceholder')}
          />
        </InputField>
        <InputField
          color={color}
          hasValue={noteText.trim().length > 0}
          containerStyle={{ minHeight: 220 }}
        >
          <TextInput
            value={noteText}
            onChangeText={setNoteText}
            placeholder={t('textNote.textPlaceholder')}
            placeholderTextColor={color.text.secondary}
            style={[getInputFieldInputStyle(color, true), { minHeight: 180 }]}
            multiline
            textAlignVertical="top"
            accessibilityLabel={t('textNote.textPlaceholder')}
          />
        </InputField>
      </KeyboardAwareScrollView>
    </View>
  );
};
