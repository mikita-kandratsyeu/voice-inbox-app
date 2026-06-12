import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TextInput as TextInputType } from 'react-native';
import { Alert, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import type { Colors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import { useMultilineInputAutoHeight } from '@/shared/lib/multilineInputAutoHeight';
import {
  getInputFieldInputStyle,
  NOTE_DOCUMENT_BODY_FONT_SIZE,
  NOTE_DOCUMENT_BODY_LINE_HEIGHT,
} from '@/shared/ui';

import {
  applyMarkdownEdit,
  applyMarkdownLink,
  isValidMarkdownLinkUrl,
  type MarkdownEditAction,
  type TextSelection,
} from '../lib/applyMarkdownEdit';
import { estimateNoteDocumentInputHeight } from '../lib/estimateNoteDocumentInputHeight';
import { NOTE_DOCUMENT_CONTENT_MAX_WIDTH } from '../lib/noteDocumentLayout';
import { useUndoRedo } from '../lib/useUndoRedo';
import { NoteDocumentLinkUrlPrompt } from './NoteDocumentLinkUrlPrompt';
import { NoteDocumentMarkdownToolbar } from './NoteDocumentMarkdownToolbar';

const MIN_INPUT_HEIGHT = 120;

type NoteDocumentSourceEditorProps = {
  color: Colors;
  value: string;
  onChangeText: (text: string) => void;
  editable: boolean;
  horizontalPadding: number;
  scrollPaddingBottom: number;
  isTablet: boolean;
  inputRef: React.RefObject<TextInputType | null>;
};

export function NoteDocumentSourceEditor({
  color,
  value,
  onChangeText,
  editable,
  horizontalPadding,
  scrollPaddingBottom,
  isTablet,
  inputRef,
}: NoteDocumentSourceEditorProps) {
  const { t } = useTranslation();
  const selectionRef = useRef<TextSelection>({ start: value.length, end: value.length });
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUndoRedoActionRef = useRef(false);

  const {
    recordChange,
    flushPending,
    undo: performUndo,
    redo: performRedo,
    canUndo: checkCanUndo,
    canRedo: checkCanRedo,
    reset: resetHistory,
  } = useUndoRedo();

  const [canUndo, setCanUndo] = React.useState(false);
  const [canRedo, setCanRedo] = React.useState(false);

  const { inputHeight: inputContentHeight, handleContentSizeChange } = useMultilineInputAutoHeight({
    inputRef,
    minHeight: MIN_INPUT_HEIGHT,
    estimateHeight: () => estimateNoteDocumentInputHeight(value, MIN_INPUT_HEIGHT, isTablet),
    heightQuantum: NOTE_DOCUMENT_BODY_LINE_HEIGHT,
  });
  const [linkPromptVisible, setLinkPromptVisible] = useState(false);

  useEffect(() => {
    // Initialize history with current value
    resetHistory(value, selectionRef.current);
  }, [resetHistory, value]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      flushPending();
    };
  }, [flushPending]);

  // Update undo/redo button states
  const updateUndoRedoState = useCallback(() => {
    setCanUndo(checkCanUndo());
    setCanRedo(checkCanRedo());
  }, [checkCanUndo, checkCanRedo]);

  const handleTextChange = useCallback(
    (text: string) => {
      onChangeText(text);

      // Record to history (unless this is an undo/redo action)
      if (!isUndoRedoActionRef.current) {
        recordChange(text, selectionRef.current);
        updateUndoRedoState();
      }

      // Mark as typing and reset timeout
      isTypingRef.current = true;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
      }, 150);
    },
    [onChangeText, recordChange, updateUndoRedoState],
  );

  const undo = useCallback(() => {
    const entry = performUndo();
    if (entry) {
      isUndoRedoActionRef.current = true;
      onChangeText(entry.text);
      selectionRef.current = entry.selection;
      requestAnimationFrame(() => {
        inputRef.current?.setNativeProps({ selection: entry.selection });
        isUndoRedoActionRef.current = false;
        updateUndoRedoState();
      });
    }
  }, [performUndo, onChangeText, inputRef, updateUndoRedoState]);

  const redo = useCallback(() => {
    const entry = performRedo();
    if (entry) {
      isUndoRedoActionRef.current = true;
      onChangeText(entry.text);
      selectionRef.current = entry.selection;
      requestAnimationFrame(() => {
        inputRef.current?.setNativeProps({ selection: entry.selection });
        isUndoRedoActionRef.current = false;
        updateUndoRedoState();
      });
    }
  }, [performRedo, onChangeText, inputRef, updateUndoRedoState]);

  const applyEditResult = useCallback(
    (result: { text: string; selection: TextSelection }) => {
      handleTextChange(result.text);
      selectionRef.current = result.selection;
      requestAnimationFrame(() => {
        inputRef.current?.setNativeProps({ selection: result.selection });
        inputRef.current?.focus();
      });
    },
    [inputRef, handleTextChange],
  );

  const applyAction = useCallback(
    (action: MarkdownEditAction) => {
      if (action === 'link') {
        setLinkPromptVisible(true);
        return;
      }

      applyEditResult(applyMarkdownEdit(value, selectionRef.current, action));
    },
    [applyEditResult, value],
  );

  const handleLinkSubmit = useCallback(
    (url: string) => {
      if (!url.trim()) {
        setLinkPromptVisible(false);
        return;
      }

      if (!isValidMarkdownLinkUrl(url)) {
        Alert.alert(
          t('recordingDetail.document.linkPrompt.invalidUrlTitle'),
          t('recordingDetail.document.linkPrompt.invalidUrlMessage'),
        );
        return;
      }

      setLinkPromptVisible(false);
      applyEditResult(applyMarkdownLink(value, selectionRef.current, url));
    },
    [applyEditResult, t, value],
  );

  return (
    <View style={{ flex: 1 }}>
      <NoteDocumentMarkdownToolbar
        color={color}
        isTablet={isTablet}
        horizontalPadding={horizontalPadding}
        onAction={applyAction}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        disabled={!editable}
      />
      <KeyboardAwareScrollView
        style={{ flex: 1, backgroundColor: color.background.primary }}
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingTop: 16,
          paddingBottom: scrollPaddingBottom,
          ...(isTablet && { alignItems: 'center' }),
        }}
        keyboardDismissMode={IS_IOS ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        disableScrollOnKeyboardHide
        showsVerticalScrollIndicator
        bottomOffset={24}
        enabled={editable}
      >
        <View
          style={{
            width: '100%',
            maxWidth: isTablet ? NOTE_DOCUMENT_CONTENT_MAX_WIDTH : undefined,
          }}
        >
          <TextInput
            ref={inputRef}
            style={[
              getInputFieldInputStyle(color, true),
              {
                flex: 0,
                width: '100%',
                color: color.text.primary,
                fontSize: NOTE_DOCUMENT_BODY_FONT_SIZE,
                lineHeight: NOTE_DOCUMENT_BODY_LINE_HEIGHT,
                minHeight: MIN_INPUT_HEIGHT,
                height: inputContentHeight,
                textAlignVertical: 'top',
              },
            ]}
            multiline
            scrollEnabled={false}
            value={value}
            onChangeText={handleTextChange}
            onContentSizeChange={handleContentSizeChange}
            onSelectionChange={(event) => {
              const newSelection = event.nativeEvent.selection;
              // Only update if selection actually changed
              if (
                newSelection.start !== selectionRef.current.start ||
                newSelection.end !== selectionRef.current.end
              ) {
                selectionRef.current = newSelection;
              }
            }}
            editable={editable}
            autoCorrect={false}
            autoCapitalize="sentences"
            keyboardAppearance="default"
            textAlignVertical="top"
            accessibilityLabel={t('recordingDetail.document.editing')}
          />
        </View>
      </KeyboardAwareScrollView>
      <NoteDocumentLinkUrlPrompt
        visible={linkPromptVisible}
        color={color}
        onCancel={() => setLinkPromptVisible(false)}
        onSubmit={handleLinkSubmit}
      />
    </View>
  );
}
