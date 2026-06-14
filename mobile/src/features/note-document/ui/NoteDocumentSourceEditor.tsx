import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import {
  EnrichedMarkdownTextInput,
  type EnrichedMarkdownTextInputInstance,
  type StyleState,
} from 'react-native-enriched-markdown';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import type { Colors } from '@/shared/config';
import {
  NOTE_DOCUMENT_BODY_FONT_SIZE,
  NOTE_DOCUMENT_BODY_LINE_HEIGHT,
} from '@/shared/ui/documentMarkdownTheme';

import { buildNoteDocumentEnrichedInputStyle } from '../lib/enrichedMarkdownTheme';
import {
  type EnrichedMarkdownToolbarAction,
  NoteDocumentMarkdownToolbar,
} from './NoteDocumentMarkdownToolbar';
import { NoteDocumentSourceEditorSizeBanner } from './NoteDocumentSourceEditorSizeBanner';

type NoteDocumentSourceEditorProps = {
  color: Colors;
  documentKey: string;
  initialMarkdown: string;
  onDirty: () => void;
  editable: boolean;
  horizontalPadding: number;
  scrollPaddingBottom: number;
  isTablet: boolean;
  showLargeDocumentWarning?: boolean;
  inputRef: React.RefObject<EnrichedMarkdownTextInputInstance | null>;
};

export const NoteDocumentSourceEditor = React.memo(function NoteDocumentSourceEditor({
  color,
  documentKey,
  initialMarkdown,
  onDirty,
  editable,
  horizontalPadding,
  scrollPaddingBottom,
  isTablet,
  showLargeDocumentWarning = false,
  inputRef,
}: NoteDocumentSourceEditorProps) {
  const { t } = useTranslation();
  const [styleState, setStyleState] = useState<StyleState | null>(null);

  // Debounce onDirty calls to reduce parent component re-renders
  const dirtyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDirtyRef = useRef(false);
  const hasPendingDirtyCallRef = useRef(false);

  const inputMarkdownStyle = useMemo(() => buildNoteDocumentEnrichedInputStyle(color), [color]);
  const editorAreaStyle = useMemo(
    () => ({
      flex: 1,
      backgroundColor: color.background.primary,
      ...(isTablet && { alignItems: 'center' as const }),
    }),
    [color.background.primary, isTablet],
  );
  const toolbarOverlayStyle = useMemo(
    () => ({
      zIndex: 1,
    }),
    [],
  );
  const inputStyle = useMemo(
    () => ({
      flex: 1,
      width: '100%' as const,
      color: color.text.primary,
      fontSize: NOTE_DOCUMENT_BODY_FONT_SIZE,
      lineHeight: NOTE_DOCUMENT_BODY_LINE_HEIGHT,
      textAlignVertical: 'top' as const,
      backgroundColor: color.background.primary,
    }),
    [color.background.primary, color.text.primary],
  );

  // Debounce onDirty to 1000ms to reduce parent re-renders
  // First change marks dirty immediately, subsequent changes debounced
  const handleChangeText = useCallback(() => {
    if (!isDirtyRef.current) {
      isDirtyRef.current = true;
      hasPendingDirtyCallRef.current = true;

      dirtyTimeoutRef.current = setTimeout(() => {
        if (hasPendingDirtyCallRef.current) {
          onDirty();
          hasPendingDirtyCallRef.current = false;
        }
        dirtyTimeoutRef.current = null;
      }, 1000);
      return;
    }

    // Already dirty, just reset the debounce timer
    if (dirtyTimeoutRef.current) {
      clearTimeout(dirtyTimeoutRef.current);
    }

    hasPendingDirtyCallRef.current = true;
    dirtyTimeoutRef.current = setTimeout(() => {
      if (hasPendingDirtyCallRef.current) {
        onDirty();
        hasPendingDirtyCallRef.current = false;
      }
      dirtyTimeoutRef.current = null;
    }, 1000);
  }, [onDirty]);

  // Update styleState with requestAnimationFrame for immediate UI feedback
  const styleStateFrameRef = useRef<number | null>(null);
  const handleChangeState = useCallback((newState: StyleState) => {
    if (styleStateFrameRef.current !== null) {
      cancelAnimationFrame(styleStateFrameRef.current);
    }

    styleStateFrameRef.current = requestAnimationFrame(() => {
      setStyleState(newState);
      styleStateFrameRef.current = null;
    });
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void inputRef.current?.setSelection(0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [documentKey, inputRef]);

  // Cleanup timeouts and animation frames on unmount
  useEffect(() => {
    return () => {
      if (dirtyTimeoutRef.current) {
        clearTimeout(dirtyTimeoutRef.current);
      }
      if (styleStateFrameRef.current !== null) {
        cancelAnimationFrame(styleStateFrameRef.current);
      }
    };
  }, []);

  const handleToolbarAction = useCallback(
    (action: EnrichedMarkdownToolbarAction) => {
      const editor = inputRef.current;
      if (!editor) return;

      onDirty();

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
    },
    [inputRef, onDirty],
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.background.primary }}>
      {showLargeDocumentWarning ? (
        <NoteDocumentSourceEditorSizeBanner
          color={color}
          horizontalPadding={horizontalPadding}
          isTablet={isTablet}
        />
      ) : null}
      <View pointerEvents="box-none" style={toolbarOverlayStyle}>
        <NoteDocumentMarkdownToolbar
          color={color}
          isTablet={isTablet}
          horizontalPadding={horizontalPadding}
          styleState={styleState}
          onAction={handleToolbarAction}
          disabled={!editable}
        />
      </View>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: scrollPaddingBottom,
          paddingHorizontal: horizontalPadding,
          paddingTop: 12,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={16}
        removeClippedSubviews
      >
        <View style={editorAreaStyle}>
          <EnrichedMarkdownTextInput
            key={documentKey}
            ref={inputRef}
            defaultValue={initialMarkdown}
            editable={editable}
            scrollEnabled
            multiline
            autoCapitalize="sentences"
            placeholder={t('recordingDetail.document.editing')}
            placeholderTextColor={color.text.muted}
            selectionColor={color.accent.primary}
            cursorColor={color.accent.primary}
            markdownStyle={inputMarkdownStyle}
            onChangeText={handleChangeText}
            onChangeState={handleChangeState}
            style={inputStyle}
          />
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
});
