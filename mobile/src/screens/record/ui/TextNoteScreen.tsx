import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  EnrichedMarkdownTextInput,
  type EnrichedMarkdownTextInputInstance,
  type StyleState,
} from 'react-native-enriched-markdown';
import { KeyboardAwareScrollView, KeyboardController } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { dispatchAutoAiAfterTranscription } from '@/features/ai-task-queue';
import { computeAdsAllowedForInterstitial } from '@/features/app-storefront';
import { generateAndSaveEmbeddingForRecord } from '@/features/embedding-generation';
import { buildNoteDocumentEnrichedInputStyle } from '@/features/note-document/lib/enrichedMarkdownTheme';
import {
  type EnrichedMarkdownToolbarAction,
  NoteDocumentMarkdownToolbar,
} from '@/features/note-document/ui/NoteDocumentMarkdownToolbar';
import { useProEntitlement } from '@/features/pro-license';
import {
  completePendingTaskFollowUp,
  peekPendingTaskFollowUp,
  prepareRecordForTaskFollowUp,
  usePendingTaskFollowUpStore,
} from '@/features/task-outcome';
import {
  runAfterNavigationTransition,
  tryShowYandexInterstitial,
} from '@/features/yandex-interstitial';
import { useColors } from '@/shared/config';
import {
  hapticSelection,
  IS_IOS,
  useIsTablet,
  useNetworkStatus,
  useTabletContentMaxWidth,
} from '@/shared/lib';
import { FrostedHeaderIconButton, SCREEN_PADDING } from '@/shared/ui';
import {
  NOTE_DOCUMENT_BODY_FONT_SIZE,
  NOTE_DOCUMENT_BODY_LINE_HEIGHT,
} from '@/shared/ui/documentMarkdownTheme';

import { generateRecordId } from '../lib/generateRecordId';
import { getAutoTitle } from '../lib/getAutoTitle';

const TEXT_NOTE_TEMPLATE_IDS = ['dayPlan', 'gratitude', 'tasks', 'idea'] as const;
type TextNoteTemplateId = (typeof TEXT_NOTE_TEMPLATE_IDS)[number];

const TITLE_FONT_SIZE = 26;
const TITLE_LINE_HEIGHT = 32;
const HEADER_ROW_HEIGHT = 48;
const TITLE_BLOCK_HEIGHT = 56;
const TOOLBAR_BLOCK_HEIGHT = 48;
const TEMPLATES_FOOTER_HEIGHT = 96;
const EDITOR_PADDING_TOP = 12;
const EDITOR_PADDING_BOTTOM = 36;

export const TextNoteScreen = () => {
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const color = useColors();
  const contentMaxWidth = useTabletContentMaxWidth();
  const addRecord = useRecordStore((s) => s.addRecord);
  const autoAiAfterTranscription = useSettingsStore((s) => s.autoAiAfterTranscription);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const { isProActive } = useProEntitlement();
  const { isConnected } = useNetworkStatus();
  const isTablet = useIsTablet();
  const noteInputRef = useRef<EnrichedMarkdownTextInputInstance>(null);
  const saveInFlightRef = useRef(false);
  const clearPendingFollowUp = usePendingTaskFollowUpStore((s) => s.clearPending);
  const [title, setTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteEditorKey, setNoteEditorKey] = useState(0);
  const [markdownStyleState, setMarkdownStyleState] = useState<StyleState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasUnsavedChanges = title.trim().length > 0 || noteText.trim().length > 0;
  const inputMarkdownStyle = useMemo(() => buildNoteDocumentEnrichedInputStyle(color), [color]);
  const showTemplates = !noteText.trim();

  useEffect(() => {
    const pending = peekPendingTaskFollowUp();
    if (!pending || pending.mode !== 'text') return;
    setTitle(pending.draft.suggestedTitle);
    setNoteText(pending.draft.seedTranscript);
    setNoteEditorKey((key) => key + 1);
  }, []);

  const canSave = noteText.trim().length > 0 && !isSaving;

  const editorMinHeight = useMemo(() => {
    const chrome =
      insets.top +
      HEADER_ROW_HEIGHT +
      TITLE_BLOCK_HEIGHT +
      TOOLBAR_BLOCK_HEIGHT +
      EDITOR_PADDING_TOP +
      EDITOR_PADDING_BOTTOM +
      (showTemplates ? TEMPLATES_FOOTER_HEIGHT : 0) +
      insets.bottom +
      16;
    return Math.max(220, Math.round(windowHeight - chrome));
  }, [insets.bottom, insets.top, showTemplates, windowHeight]);

  const editorScrollPaddingBottom = useMemo(
    () => (showTemplates ? 8 : insets.bottom + 20),
    [insets.bottom, showTemplates],
  );

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
        onPress: () => {
          clearPendingFollowUp();
          close();
        },
      },
    ]);
  }, [clearPendingFollowUp, hasUnsavedChanges, navigation, t]);

  const handleApplyTemplate = useCallback(
    async (id: TextNoteTemplateId) => {
      hapticSelection();
      const block = t(`textNote.templateBody.${id}`);
      const editor = noteInputRef.current;
      if (!editor) return;

      const current = (await editor.getMarkdown()).trim();
      const next = current ? `${current}\n\n${block}` : block;
      editor.setValue(next);
      setNoteText(next);
      editor.focus();
    },
    [t],
  );

  const handleMarkdownStyleStateChange = useCallback((newState: StyleState) => {
    setMarkdownStyleState(newState);
  }, []);

  const handleToolbarAction = useCallback((action: EnrichedMarkdownToolbarAction) => {
    const editor = noteInputRef.current;
    if (!editor) return;

    switch (action) {
      case 'bold':
        editor.toggleBold();
        return;
      case 'italic':
        editor.toggleItalic();
        return;
      case 'strikethrough':
        editor.toggleStrikethrough();
        return;
      case 'underline':
        editor.toggleUnderline();
        return;
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (saveInFlightRef.current) {
      return;
    }
    const markdown = (await noteInputRef.current?.getMarkdown()) ?? noteText;
    const transcript = markdown.trim();
    if (!transcript) {
      return;
    }

    saveInFlightRef.current = true;
    setIsSaving(true);
    KeyboardController.dismiss({ animated: false });

    const pendingFollowUp = peekPendingTaskFollowUp();
    const record: VoiceRecord = prepareRecordForTaskFollowUp(
      {
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
      },
      pendingFollowUp?.mode === 'text' ? pendingFollowUp : null,
    );

    try {
      await addRecord(record);
      await completePendingTaskFollowUp(
        record.id,
        pendingFollowUp?.mode === 'text' ? pendingFollowUp : null,
      );
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
        className="flex-row items-center justify-between"
        style={{
          paddingTop: insets.top + 10,
          paddingBottom: 6,
          paddingHorizontal: SCREEN_PADDING - 4,
          minHeight: insets.top + HEADER_ROW_HEIGHT,
        }}
      >
        <FrostedHeaderIconButton
          iconOnly
          variant="icon"
          size="md"
          icon={<X size={22} color={color.text.primary} strokeWidth={2.2} />}
          color={color}
          onPress={handleBack}
          disabled={isSaving}
          accessibilityLabel={t('common.close')}
        />
        <FrostedHeaderIconButton
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

      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
          paddingHorizontal: SCREEN_PADDING,
        }}
      >
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('textNote.titlePlaceholder')}
          placeholderTextColor={color.text.muted}
          style={{
            paddingTop: 6,
            paddingBottom: 14,
            fontSize: TITLE_FONT_SIZE,
            lineHeight: TITLE_LINE_HEIGHT,
            fontWeight: '700',
            color: color.text.primary,
            letterSpacing: -0.35,
          }}
          returnKeyType="next"
          onSubmitEditing={() => noteInputRef.current?.focus()}
          accessibilityLabel={t('textNote.titlePlaceholder')}
        />

        <View style={{ marginHorizontal: -SCREEN_PADDING }}>
          <NoteDocumentMarkdownToolbar
            color={color}
            isTablet={isTablet}
            horizontalPadding={SCREEN_PADDING}
            styleState={markdownStyleState}
            onAction={handleToolbarAction}
            disabled={isSaving}
          />
        </View>

        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: EDITOR_PADDING_TOP,
            paddingBottom: editorScrollPaddingBottom,
          }}
          keyboardDismissMode={IS_IOS ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={showTemplates ? TEMPLATES_FOOTER_HEIGHT + 12 : 20}
        >
          <EnrichedMarkdownTextInput
            key={`text-note-editor-${noteEditorKey}`}
            ref={noteInputRef}
            defaultValue={noteText}
            editable={!isSaving}
            scrollEnabled
            multiline
            autoCapitalize="sentences"
            placeholder={t('textNote.textPlaceholder')}
            placeholderTextColor={color.text.muted}
            selectionColor={color.accent.primary}
            cursorColor={color.accent.primary}
            markdownStyle={inputMarkdownStyle}
            onChangeText={setNoteText}
            onChangeState={handleMarkdownStyleStateChange}
            style={{
              flex: 1,
              width: '100%',
              minHeight: editorMinHeight,
              paddingTop: 4,
              paddingBottom: EDITOR_PADDING_BOTTOM,
              color: color.text.primary,
              fontSize: NOTE_DOCUMENT_BODY_FONT_SIZE,
              lineHeight: NOTE_DOCUMENT_BODY_LINE_HEIGHT,
              textAlignVertical: 'top',
              backgroundColor: 'transparent',
            }}
          />
        </KeyboardAwareScrollView>
      </View>

      {showTemplates ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: color.border.default,
            backgroundColor: color.background.secondary,
            paddingTop: 14,
            paddingBottom: insets.bottom + 14,
            paddingHorizontal: SCREEN_PADDING,
            gap: 12,
          }}
          accessibilityLabel={t('textNote.templatesTitle')}
          accessibilityHint={t('textNote.templatesHint1')}
        >
          <Text className="text-[12px] font-semibold" style={{ color: color.text.secondary }}>
            {t('textNote.templatesTitle')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 8, paddingRight: 4 }}
          >
            {TEXT_NOTE_TEMPLATE_IDS.map((id) => (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={t(`textNote.templateChip.${id}`)}
                disabled={isSaving}
                onPress={() => handleApplyTemplate(id)}
                className="rounded-full px-3.5 py-2 active:opacity-75"
                style={{ backgroundColor: color.background.tertiary }}
              >
                <Text className="text-[14px] font-medium" style={{ color: color.text.primary }}>
                  {t(`textNote.templateChip.${id}`)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
};
