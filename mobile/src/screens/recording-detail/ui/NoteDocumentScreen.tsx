import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BookOpen, Check, FileCode, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import type { EnrichedMarkdownTextInputInstance } from 'react-native-enriched-markdown';
import { KeyboardController } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList } from '@/app/navigation/types';
import { useRecordStore } from '@/entities/record';
import {
  NOTE_DOCUMENT_CONTENT_MAX_WIDTH,
  NOTE_DOCUMENT_TABLET_HORIZONTAL_PADDING,
  NoteDocumentPreparingState,
  NoteDocumentReadingBody,
  NoteDocumentSavingOverlay,
  NoteDocumentSourceEditor,
  shouldWarnNoteDocumentEditorSize,
  useNoteDocument,
} from '@/features/note-document';
import type { WikiLinkResolvableRecord } from '@/features/note-links';
import {
  appendLinkedNotesSectionForSourceEditor,
  stripLinkedNotesSectionFromSourceEditor,
} from '@/features/note-links';
import { TaskOutcomeSheet, useTaskCompletionFlow } from '@/features/task-outcome';
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
  const initialSourcePromptRef = useRef(false);

  const scrollPaddingBottom = insets.bottom + 4;

  const { record, initialMode } = route.params;
  const {
    liveRecord,
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
    markEditorDirty,
    clearEditorDirty,
    finishSaving,
  } = useNoteDocument({
    recordId: record.id,
    fallbackRecord: record,
    initialMode,
  });

  const records = useRecordStore(useShallow((s) => s.records));

  const wikiLinkRecords = useMemo<readonly WikiLinkResolvableRecord[]>(
    () =>
      records.map((item) => ({
        id: item.id,
        title: item.title ?? '',
        status: item.status,
        createdAt: item.createdAt,
      })),
    [records],
  );

  const handleOpenLinkedRecord = useCallback(
    (recordId: string) => {
      const target = records.find((item) => item.id === recordId);
      if (!target) return;
      navigation.replace('RecordingDetail', { record: target });
    },
    [navigation, records],
  );

  const linkedRecordIds = useMemo(
    () => liveRecord.linkedRecordIds ?? [],
    [liveRecord.linkedRecordIds],
  );

  const sourceEditorMarkdown = useMemo(
    () =>
      appendLinkedNotesSectionForSourceEditor(
        documentMarkdown,
        linkedRecordIds,
        wikiLinkRecords,
        t('noteLinks.linked'),
      ),
    [documentMarkdown, linkedRecordIds, t, wikiLinkRecords],
  );

  const sourceEditorDocumentKey = useMemo(
    () => `${record.id}:${sourceEditorKey}:${linkedRecordIds.join(',')}`,
    [linkedRecordIds, record.id, sourceEditorKey],
  );

  const showTaskUpdateError = useCallback(() => {
    Alert.alert(t('common.error'), t('allTasks.taskUpdateError'));
  }, [t]);

  const handleTaskCompletedInReading = useCallback(
    (taskId: string) => {
      const task = readingTasks.find((item) => item.id === taskId);
      if (!task || task.isDone) return;
      toggleTaskInReading(taskId);
    },
    [readingTasks, toggleTaskInReading],
  );

  const {
    outcomeTarget,
    linkedNoteContext,
    requestTaskToggle,
    closeOutcomeSheet,
    completeWithOutcome,
    completeAndSkip,
    startVoiceFollowUp,
    startTextFollowUp,
  } = useTaskCompletionFlow({
    navigation,
    onUpdateError: showTaskUpdateError,
    onTaskCompleted: handleTaskCompletedInReading,
  });

  const handleToggleTaskInReading = useCallback(
    (taskId: string) => {
      const task = readingTasks.find((item) => item.id === taskId);
      if (!task) return;
      if (task.isDone) {
        requestTaskToggle(liveRecord.id, task);
        toggleTaskInReading(taskId);
        return;
      }
      requestTaskToggle(liveRecord.id, task);
    },
    [liveRecord.id, readingTasks, requestTaskToggle, toggleTaskInReading],
  );

  const canSave = hasUnsavedChanges && !isSaving && !isPreparing;
  const controlsDisabled = isSaving || isPreparing;
  const documentCharacterCount = documentMarkdown.length;
  const showSourceEditorSizeBanner =
    mode === 'source' && shouldWarnNoteDocumentEditorSize(documentCharacterCount);

  const screenTitle = liveRecord.title;

  const enterSourceMode = useCallback(() => {
    clearEditorDirty();
    setSourceEditorKey((current) => current + 1);
    setMode('source');
  }, [clearEditorDirty, setMode]);

  const promptLargeDocumentBeforeSource = useCallback(
    (onContinue: () => void) => {
      if (!shouldWarnNoteDocumentEditorSize(documentCharacterCount)) {
        onContinue();
        return;
      }

      Alert.alert(
        t('recordingDetail.document.largeDocumentWarnTitle'),
        t('recordingDetail.document.largeDocumentWarnMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('recordingDetail.document.largeDocumentWarnContinue'),
            style: 'destructive',
            onPress: onContinue,
          },
        ],
      );
    },
    [documentCharacterCount, t],
  );

  useEffect(() => {
    if (isPreparing || initialSourcePromptRef.current) {
      return;
    }
    if (initialMode !== 'source' || mode !== 'source') {
      return;
    }
    if (!shouldWarnNoteDocumentEditorSize(documentCharacterCount)) {
      return;
    }

    initialSourcePromptRef.current = true;
    setMode('reading');
    promptLargeDocumentBeforeSource(enterSourceMode);
  }, [
    documentCharacterCount,
    enterSourceMode,
    initialMode,
    isPreparing,
    mode,
    promptLargeDocumentBeforeSource,
    setMode,
  ]);

  const getSourceEditorMarkdown = useCallback(async () => {
    if (mode !== 'source') {
      return documentMarkdown;
    }
    const markdown = await sourceInputRef.current?.getMarkdown();
    return markdown ?? sourceEditorMarkdown;
  }, [documentMarkdown, mode, sourceEditorMarkdown]);

  const flushEditorMarkdown = useCallback(async () => {
    const markdown = await getSourceEditorMarkdown();
    return mode === 'source' ? stripLinkedNotesSectionFromSourceEditor(markdown) : markdown;
  }, [getSourceEditorMarkdown, mode]);

  const saveFromEditor = useCallback(async () => {
    const markdown = await getSourceEditorMarkdown();
    return save(markdown, {
      syncLinkedNotes: mode === 'source',
      wikiLinkRecords,
    });
  }, [getSourceEditorMarkdown, mode, save, wikiLinkRecords]);

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
              const result = await saveFromEditor();
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
  }, [close, finishSaving, hasUnsavedChanges, reset, saveFromEditor, t]);

  const handleSave = useCallback(async () => {
    KeyboardController.dismiss({ animated: false });
    const result = await saveFromEditor();
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
  }, [finishSaving, mode, saveFromEditor, setMode, t]);

  const handleToggleMode = useCallback(() => {
    if (mode === 'reading') {
      promptLargeDocumentBeforeSource(enterSourceMode);
      return;
    }

    void (async () => {
      const markdown = await flushEditorMarkdown();
      setDocumentMarkdown(markdown);
      clearEditorDirty();
      KeyboardController.dismiss({ animated: false });
      setMode('reading');
    })();
  }, [
    clearEditorDirty,
    enterSourceMode,
    flushEditorMarkdown,
    mode,
    promptLargeDocumentBeforeSource,
    setDocumentMarkdown,
    setMode,
  ]);

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
        className="flex-row items-center px-4 pb-3"
        style={{
          backgroundColor: color.background.primary,
          borderBottomWidth: 1,
          borderBottomColor: color.border.default,
          paddingTop: insets.top + 12,
        }}
      >
        <View className="shrink-0">
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
          className="min-w-0 flex-1 pl-3 pr-2"
          accessibilityRole="header"
          accessibilityLabel={screenTitle}
          onPress={() => KeyboardController.dismiss()}
          hitSlop={{ top: 8, bottom: 8 }}
        >
          <Text
            className="text-left text-[15px] font-semibold"
            style={{ color: color.text.primary }}
            numberOfLines={1}
          >
            {screenTitle}
          </Text>
        </Pressable>
        <View className="shrink-0 flex-row items-center gap-2">
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
        <View style={{ flex: 1, backgroundColor: color.background.primary }}>
          {mode === 'reading' ? (
            <ScrollView
              style={{ flex: 1, backgroundColor: color.background.primary }}
              contentContainerStyle={readingContentContainerStyle}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <View style={readingColumnStyle}>
                <NoteDocumentReadingBody
                  color={color}
                  documentMarkdown={documentMarkdown}
                  tasks={readingTasks}
                  linkedRecordIds={linkedRecordIds}
                  wikiLinkRecords={wikiLinkRecords}
                  onOpenRecord={handleOpenLinkedRecord}
                  onToggleTask={handleToggleTaskInReading}
                />
              </View>
            </ScrollView>
          ) : (
            <NoteDocumentSourceEditor
              color={color}
              documentKey={sourceEditorDocumentKey}
              initialMarkdown={sourceEditorMarkdown}
              onDirty={markEditorDirty}
              editable={!isSaving}
              horizontalPadding={sourceHorizontalPadding}
              scrollPaddingBottom={scrollPaddingBottom}
              isTablet={isTablet}
              showLargeDocumentWarning={showSourceEditorSizeBanner}
              inputRef={sourceInputRef}
            />
          )}
          {isSaving ? <NoteDocumentSavingOverlay /> : null}
        </View>
      )}
      <TaskOutcomeSheet
        visible={outcomeTarget !== null}
        task={outcomeTarget?.task ?? null}
        linkedNoteContext={linkedNoteContext}
        onClose={closeOutcomeSheet}
        onComplete={completeWithOutcome}
        onSkip={completeAndSkip}
        onVoiceFollowUp={startVoiceFollowUp}
        onTextFollowUp={startTextFollowUp}
      />
    </View>
  );
};
