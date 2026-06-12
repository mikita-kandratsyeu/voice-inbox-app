import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, LayoutTemplate, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardController } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { dispatchAutoAiAfterTranscription } from '@/features/ai-task-queue';
import { computeAdsAllowedForInterstitial } from '@/features/app-storefront';
import { generateAndSaveEmbeddingForRecord } from '@/features/embedding-generation';
import { useProEntitlement } from '@/features/pro-license';
import {
  runAfterNavigationTransition,
  tryShowYandexInterstitial,
} from '@/features/yandex-interstitial';
import { useColors } from '@/shared/config';
import { hapticSelection, useNetworkStatus } from '@/shared/lib';
import { getInputFieldInputStyle, HeaderIconButton, InputField } from '@/shared/ui';

import { generateRecordId } from '../lib/generateRecordId';
import { getAutoTitle } from '../lib/getAutoTitle';

const TEXT_NOTE_TEMPLATE_IDS = ['dayPlan', 'gratitude', 'tasks', 'idea'] as const;
type TextNoteTemplateId = (typeof TEXT_NOTE_TEMPLATE_IDS)[number];

export const TextNoteScreen = () => {
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const color = useColors();
  const addRecord = useRecordStore((s) => s.addRecord);
  const autoAiAfterTranscription = useSettingsStore((s) => s.autoAiAfterTranscription);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const { isProActive } = useProEntitlement();
  const { isConnected } = useNetworkStatus();
  const noteInputRef = useRef<TextInput>(null);
  const saveInFlightRef = useRef(false);
  const [title, setTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const hasUnsavedChanges = title.trim().length > 0 || noteText.trim().length > 0;

  const canSave = noteText.trim().length > 0 && !isSaving;

  /** Cap note field height so long templates scroll inside the input; templates card stays reachable. */
  const noteBodyMaxHeight = useMemo(
    () => Math.round(Math.min(300, Math.max(200, windowHeight * 0.34))),
    [windowHeight],
  );
  const noteFieldVerticalPadding = 14 * 2;
  const noteInputContainerMaxHeight = noteBodyMaxHeight + noteFieldVerticalPadding;

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

  const templateHints = useMemo(
    () => [t('textNote.templatesHint1'), t('textNote.templatesHint2')],
    [t],
  );

  const handleApplyTemplate = useCallback(
    (id: TextNoteTemplateId) => {
      hapticSelection();
      const block = t(`textNote.templateBody.${id}`);
      setNoteText((prev) => {
        const trimmed = prev.trim();
        if (!trimmed) return block;
        return `${trimmed}\n\n${block}`;
      });
      requestAnimationFrame(() => noteInputRef.current?.focus());
    },
    [t],
  );

  const handleSave = useCallback(async () => {
    if (saveInFlightRef.current) {
      return;
    }
    const transcript = noteText.trim();
    if (!transcript) {
      return;
    }

    saveInFlightRef.current = true;
    setIsSaving(true);
    KeyboardController.dismiss({ animated: false });

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

    try {
      await addRecord(record);
    } catch {
      saveInFlightRef.current = false;
      setIsSaving(false);
      return;
    }

    generateAndSaveEmbeddingForRecord(record).catch(() => {});

    void dispatchAutoAiAfterTranscription({
      record,
      autoAiAfterTranscription,
      isProActive,
      isConnected: isConnected === true,
      aiExecutionMode,
      privateAiProvider,
    }).catch(() => {});

    navigation.goBack();
    const adsAllowed = computeAdsAllowedForInterstitial(isProActive);
    runAfterNavigationTransition(() => {
      void tryShowYandexInterstitial({ adsAllowed, trigger: 'after_note_create' });
    });
  }, [
    addRecord,
    aiExecutionMode,
    autoAiAfterTranscription,
    isConnected,
    isProActive,
    navigation,
    noteText,
    privateAiProvider,
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
        <HeaderIconButton
          iconOnly
          variant="icon"
          size="md"
          icon={<X size={22} color={color.text.primary} strokeWidth={2.2} />}
          color={color}
          onPress={handleBack}
          disabled={isSaving}
          accessibilityLabel={t('common.close')}
        />
        <Text
          className="flex-1 px-2 text-center text-[18px] font-semibold"
          style={{ color: color.text.primary }}
        >
          {getAutoTitle(false)}
        </Text>
        <HeaderIconButton
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
            onSubmitEditing={() => noteInputRef.current?.focus()}
            accessibilityLabel={t('textNote.titlePlaceholder')}
          />
        </InputField>
        <InputField
          color={color}
          hasValue={noteText.trim().length > 0}
          containerStyle={{
            alignItems: 'flex-start',
            minHeight: 148,
            maxHeight: noteInputContainerMaxHeight,
          }}
        >
          <TextInput
            ref={noteInputRef}
            value={noteText}
            onChangeText={setNoteText}
            placeholder={t('textNote.textPlaceholder')}
            placeholderTextColor={color.text.secondary}
            style={[
              getInputFieldInputStyle(color, true),
              {
                alignSelf: 'stretch',
                minHeight: 120,
                maxHeight: noteBodyMaxHeight,
              },
            ]}
            multiline
            scrollEnabled
            textAlignVertical="top"
            accessibilityLabel={t('textNote.textPlaceholder')}
          />
        </InputField>

        <View
          className="rounded-2xl p-4"
          style={{
            borderWidth: 1,
            borderColor: color.border.default,
            backgroundColor: color.background.card,
          }}
        >
          <View className="mb-3 flex-row items-center gap-2">
            <LayoutTemplate size={18} color={color.accent.primary} strokeWidth={1.8} />
            <Text
              className="text-[16px] font-semibold leading-[21px]"
              style={{ color: color.text.primary }}
            >
              {t('textNote.templatesTitle')}
            </Text>
          </View>
          {templateHints.map((hint) => (
            <View key={hint} className="mb-2 flex-row gap-2">
              <Text className="text-[14px] leading-5" style={{ color: color.accent.primary }}>
                •
              </Text>
              <Text
                className="flex-1 text-[14px] leading-5"
                style={{ color: color.text.secondary }}
              >
                {hint}
              </Text>
            </View>
          ))}
          <View className="mt-3 flex-row flex-wrap gap-2">
            {TEXT_NOTE_TEMPLATE_IDS.map((id) => (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={t(`textNote.templateChip.${id}`)}
                hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                disabled={isSaving}
                onPress={() => handleApplyTemplate(id)}
                className="rounded-full px-3 py-2 active:opacity-70"
                style={{
                  backgroundColor: color.background.tertiary,
                  borderWidth: 1,
                  borderColor: color.border.default,
                }}
              >
                <Text className="text-[14px] leading-5" style={{ color: color.text.secondary }}>
                  {t(`textNote.templateChip.${id}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};
