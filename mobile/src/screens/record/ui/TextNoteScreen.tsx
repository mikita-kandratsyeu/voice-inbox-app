import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardController } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useColors } from '@/shared/config';
import { Button, getInputFieldInputStyle, InputField, ScreenHeader } from '@/shared/ui';

import { generateRecordId } from '../lib/generateRecordId';
import { getAutoTitle } from '../lib/getAutoTitle';

export const TextNoteScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const color = useColors();
  const addRecord = useRecordStore((s) => s.addRecord);
  const [title, setTitle] = useState('');
  const [noteText, setNoteText] = useState('');

  const canSave = noteText.trim().length > 0;

  const resolvedTitle = useMemo(() => {
    const trimmed = title.trim();

    if (trimmed.length > 0) {
      return trimmed;
    }

    return getAutoTitle();
  }, [title]);

  const handleBack = useCallback(() => {
    KeyboardController.dismiss({ animated: false });
    navigation.goBack();
  }, [navigation]);

  const handleSave = useCallback(() => {
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

    addRecord(record);
    KeyboardController.dismiss({ animated: false });
    navigation.goBack();
  }, [addRecord, navigation, noteText, resolvedTitle]);

  return (
    <View style={{ flex: 1, backgroundColor: color.background.primary }}>
      <ScreenHeader
        title={t('textNote.title')}
        onBack={handleBack}
        rightSlot={
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
        }
      />
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
