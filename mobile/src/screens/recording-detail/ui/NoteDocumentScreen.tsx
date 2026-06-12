import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BookOpen, Check, FileCode, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardController } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { RootStackParamList } from '@/app/navigation/types';
import {
  NoteDocumentPreparingState,
  stripNoteDocumentMarkers,
  useNoteDocument,
} from '@/features/note-document';
import { useColors } from '@/shared/config';
import { hapticSuccess, useIsTablet } from '@/shared/lib';
import { getInputFieldInputStyle, HeaderIconButton } from '@/shared/ui';
import { NoteMarkdown } from '@/shared/ui/NoteMarkdown';

export const NoteDocumentScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'NoteDocument'>>();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const color = useColors();
  const isTablet = useIsTablet();
  const sourceInputRef = useRef<TextInput>(null);

  const editorMinHeight = useMemo(
    () => Math.max(280, windowHeight - insets.top - insets.bottom - 96),
    [insets.bottom, insets.top, windowHeight],
  );

  const scrollPaddingBottom = getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet);

  const { record } = route.params;
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
  } = useNoteDocument({ recordId: record.id, fallbackRecord: record });

  const readingContent = useMemo(
    () => stripNoteDocumentMarkers(documentMarkdown),
    [documentMarkdown],
  );

  const canSave = mode === 'source' && hasUnsavedChanges && !isSaving && !isPreparing;
  const controlsDisabled = isSaving || isPreparing;

  const screenTitle = useMemo(() => t('recordingDetail.document.screenTitle'), [i18n.language, t]);

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
              close();
            })();
          },
        },
      ],
    );
  }, [close, hasUnsavedChanges, reset, save, t]);

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
    hapticSuccess();
    setMode('reading');
  }, [save, setMode, t]);

  const handleToggleMode = useCallback(() => {
    if (mode === 'reading') {
      setMode('source');
      requestAnimationFrame(() => sourceInputRef.current?.focus());
      return;
    }
    KeyboardController.dismiss({ animated: false });
    setMode('reading');
  }, [mode, setMode]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        KeyboardController.dismiss({ animated: false });
      };
    }, []),
  );

  const readingHorizontalPadding = 16;
  const sourceHorizontalPadding = 20;

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
        <Text
          className="min-w-0 flex-1 px-2 text-center text-[18px] font-semibold"
          style={{ color: color.text.primary }}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {screenTitle}
        </Text>
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
      ) : mode === 'reading' ? (
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: readingHorizontalPadding,
            paddingTop: 16,
            paddingBottom: scrollPaddingBottom,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          bottomOffset={16}
        >
          <NoteMarkdown color={color} variant="document">
            {readingContent}
          </NoteMarkdown>
        </KeyboardAwareScrollView>
      ) : (
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: sourceHorizontalPadding,
            paddingTop: 16,
            paddingBottom: scrollPaddingBottom,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          bottomOffset={16}
        >
          <TextInput
            ref={sourceInputRef}
            style={[
              getInputFieldInputStyle(color, true),
              {
                color: color.text.primary,
                fontFamily: 'Menlo',
                fontSize: 14,
                lineHeight: 22,
                minHeight: editorMinHeight,
                textAlignVertical: 'top',
              },
            ]}
            multiline
            scrollEnabled
            value={documentMarkdown}
            onChangeText={setDocumentMarkdown}
            editable={!isSaving}
            autoCorrect={false}
            autoCapitalize="sentences"
            accessibilityLabel={t('recordingDetail.document.editing')}
          />
        </KeyboardAwareScrollView>
      )}
    </View>
  );
};
