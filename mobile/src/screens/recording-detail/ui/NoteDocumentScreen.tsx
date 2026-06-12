import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BookOpen, Check, FileCode, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text, View } from 'react-native';
import type { EnrichedMarkdownTextInputInstance } from 'react-native-enriched-markdown';
import { KeyboardAwareScrollView, KeyboardController } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/app/navigation/types';
import {
  NOTE_DOCUMENT_CONTENT_MAX_WIDTH,
  NOTE_DOCUMENT_TABLET_HORIZONTAL_PADDING,
  NoteDocumentPreparingState,
  NoteDocumentReadingBody,
  NoteDocumentSavingOverlay,
  NoteDocumentSourceEditor,
  useNoteDocument,
} from '@/features/note-document';
import { useColors } from '@/shared/config';
import { hapticSuccess, useIsTablet } from '@/shared/lib';
import { HeaderIconButton } from '@/shared/ui';

export const NoteDocumentScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'NoteDocument'>>();
  const insets = useSafeAreaInsets();
  const color = useColors();
  const isTablet = useIsTablet();
  const sourceInputRef = useRef<EnrichedMarkdownTextInputInstance>(null);
  const [sourceEditorKey, setSourceEditorKey] = useState(0);

  const scrollPaddingBottom = insets.bottom + 24;

  const { record, initialMode } = route.params;
  const {
    documentMarkdown,
    setDocumentMarkdown,
    mode,
    setMode,
    hasUnsavedChanges,
    save,
    reset,
    isSaving,
    isPreparing,
    readingTasks,
    toggleTaskInReading,
    finishSaving,
  } = useNoteDocument({
    recordId: record.id,
    fallbackRecord: record,
    initialMode,
  });

  const canSave = hasUnsavedChanges && !isSaving && !isPreparing;
  const controlsDisabled = isSaving || isPreparing;

  const screenTitle = useMemo(() => t('recordingDetail.document.screenTitle'), [t]);

  const close = useCallback(() => {
    KeyboardController.dismiss({ animated: false });
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    if (!hasUnsavedChanges) {
      close();
      return;
    }

    Alert.alert(
      t('recordingDetail.document.unsavedTitle'),
      t('recordingDetail.document.unsavedMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('recordingDetail.document.discard'),
          style: 'destructive',
          onPress: () => {
            reset();
            close();
          },
        },
        {
          text: t('recordingDetail.document.save'),
          onPress: () => {
            void (async () => {
              const result = await save();
              if (result === 'parse_error') {
                Alert.alert(
                  t('recordingDetail.document.parseErrorTitle'),
                  t('recordingDetail.document.parseErrorMessage'),
                );
                return;
              }
              hapticSuccess();
              finishSaving();
              close();
            })();
          },
        },
      ],
    );
  }, [close, finishSaving, hasUnsavedChanges, reset, save, t]);

  const handleSave = useCallback(async () => {
    KeyboardController.dismiss({ animated: false });
    const result = await save();
    if (result === 'parse_error') {
      Alert.alert(
        t('recordingDetail.document.parseErrorTitle'),
        t('recordingDetail.document.parseErrorMessage'),
      );
      return;
    }
    if (mode === 'source') {
      setMode('reading');
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hapticSuccess();
        finishSaving();
      });
    });
  }, [finishSaving, mode, save, setMode, t]);

  const handleToggleMode = useCallback(() => {
    if (mode === 'reading') {
      setSourceEditorKey((current) => current + 1);
      setMode('source');
      requestAnimationFrame(() => sourceInputRef.current?.focus());
      return;
    }
    KeyboardController.dismiss({ animated: false });
    setMode('reading');
  }, [mode, setMode]);

  useEffect(() => {
    if (initialMode !== 'source' || isPreparing) {
      return;
    }
    requestAnimationFrame(() => sourceInputRef.current?.focus());
  }, [initialMode, isPreparing]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        KeyboardController.dismiss({ animated: false });
      };
    }, []),
  );

  const readingHorizontalPadding = isTablet ? NOTE_DOCUMENT_TABLET_HORIZONTAL_PADDING : 20;
  const sourceHorizontalPadding = isTablet ? NOTE_DOCUMENT_TABLET_HORIZONTAL_PADDING : 20;

  const readingContentContainerStyle = useMemo(
    () => ({
      paddingHorizontal: readingHorizontalPadding,
      paddingTop: 20,
      paddingBottom: scrollPaddingBottom + 32,
      ...(isTablet && { alignItems: 'center' as const }),
    }),
    [isTablet, readingHorizontalPadding, scrollPaddingBottom],
  );

  const readingColumnStyle = useMemo(
    () => ({
      width: '100%' as const,
      maxWidth: isTablet ? NOTE_DOCUMENT_CONTENT_MAX_WIDTH : undefined,
    }),
    [isTablet],
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isPreparing ? color.background.secondary : color.background.primary,
      }}
    >
      <View
        className="flex-row items-center justify-between px-4 pb-3"
        style={{
          backgroundColor: color.background.primary,
          borderBottomWidth: 1,
          borderBottomColor: color.border.default,
          paddingTop: insets.top + 12,
        }}
      >
        <View className="min-w-[96px] shrink-0 items-start">
          <HeaderIconButton
            iconOnly
            variant="icon"
            size="md"
            icon={<X size={22} color={color.text.primary} strokeWidth={2.2} />}
            color={color}
            onPress={handleClose}
            disabled={isSaving}
            accessibilityLabel={t('common.close')}
          />
        </View>
        <Pressable
          className="min-w-0 flex-1 px-2"
          accessibilityRole="header"
          accessibilityLabel={screenTitle}
          onPress={() => KeyboardController.dismiss()}
          hitSlop={{ top: 8, bottom: 8 }}
        >
          <Text
            className="text-center text-[18px] font-semibold"
            style={{ color: color.text.primary }}
            numberOfLines={1}
          >
            {screenTitle}
          </Text>
        </Pressable>
        <View className="min-w-[96px] shrink-0 flex-row items-center justify-end gap-2">
          <HeaderIconButton
            iconOnly
            variant="icon"
            size="md"
            icon={
              mode === 'reading' ? (
                <FileCode size={20} color={color.text.primary} strokeWidth={2.2} />
              ) : (
                <BookOpen size={20} color={color.text.primary} strokeWidth={2.2} />
              )
            }
            color={color}
            onPress={handleToggleMode}
            disabled={controlsDisabled}
            accessibilityLabel={
              mode === 'reading'
                ? t('recordingDetail.document.switchToEditingA11y')
                : t('recordingDetail.document.switchToReadingA11y')
            }
          />
          <HeaderIconButton
            iconOnly
            variant="icon"
            size="md"
            icon={<Check size={22} color={color.accent.primary} strokeWidth={2.5} />}
            color={color}
            onPress={() => void handleSave()}
            disabled={!canSave}
            accessibilityLabel={t('common.save')}
            accessibilityState={{ disabled: !canSave }}
          />
        </View>
      </View>

      {isPreparing ? (
        <NoteDocumentPreparingState />
      ) : (
        <View style={{ flex: 1 }}>
          {mode === 'reading' ? (
            <KeyboardAwareScrollView
              style={{ flex: 1, backgroundColor: color.background.primary }}
              contentContainerStyle={readingContentContainerStyle}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              bottomOffset={16}
            >
              <View style={readingColumnStyle}>
                <NoteDocumentReadingBody
                  color={color}
                  documentMarkdown={documentMarkdown}
                  tasks={readingTasks}
                  onToggleTask={toggleTaskInReading}
                />
              </View>
            </KeyboardAwareScrollView>
          ) : (
            <NoteDocumentSourceEditor
              color={color}
              documentKey={`${record.id}:${sourceEditorKey}`}
              initialMarkdown={documentMarkdown}
              onChangeMarkdown={setDocumentMarkdown}
              editable={!isSaving}
              horizontalPadding={sourceHorizontalPadding}
              scrollPaddingBottom={scrollPaddingBottom}
              isTablet={isTablet}
              inputRef={sourceInputRef}
              autoFocus={initialMode === 'source'}
            />
          )}
          {isSaving ? <NoteDocumentSavingOverlay /> : null}
        </View>
      )}
    </View>
  );
};
