import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import {
  EnrichedMarkdownTextInput,
  type EnrichedMarkdownTextInputInstance,
  type StyleState,
} from 'react-native-enriched-markdown';

import type { Colors } from '@/shared/config';
import {
  NOTE_DOCUMENT_BODY_FONT_SIZE,
  NOTE_DOCUMENT_BODY_LINE_HEIGHT,
} from '@/shared/ui/documentMarkdownTheme';

import { buildNoteDocumentEnrichedInputStyle } from '../lib/enrichedMarkdownTheme';
import { NOTE_DOCUMENT_CONTENT_MAX_WIDTH } from '../lib/noteDocumentLayout';
import {
  type EnrichedMarkdownToolbarAction,
  NOTE_DOCUMENT_TOOLBAR_FALLBACK_HEIGHT,
  NoteDocumentMarkdownToolbar,
} from './NoteDocumentMarkdownToolbar';

type NoteDocumentSourceEditorProps = {
  color: Colors;
  documentKey: string;
  initialMarkdown: string;
  onDirty: () => void;
  editable: boolean;
  horizontalPadding: number;
  scrollPaddingBottom: number;
  isTablet: boolean;
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
  inputRef,
}: NoteDocumentSourceEditorProps) {
  const { t } = useTranslation();
  const [styleState, setStyleState] = useState<StyleState | null>(null);
  const [toolbarHeight, setToolbarHeight] = useState(NOTE_DOCUMENT_TOOLBAR_FALLBACK_HEIGHT);

  // Throttle onDirty calls to reduce re-renders
  const dirtyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDirtyRef = useRef(false);

  const inputMarkdownStyle = useMemo(() => buildNoteDocumentEnrichedInputStyle(color), [color]);
  const editorColumnStyle = useMemo(
    () => ({
      width: '100%' as const,
      maxWidth: isTablet ? NOTE_DOCUMENT_CONTENT_MAX_WIDTH : undefined,
      flex: 1,
    }),
    [isTablet],
  );
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
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
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
      paddingHorizontal: horizontalPadding,
      // Scrolls with content so text can move flush under the overlaid toolbar.
      marginTop: toolbarHeight,
      marginBottom: scrollPaddingBottom,
    }),
    [
      color.background.primary,
      color.text.primary,
      horizontalPadding,
      scrollPaddingBottom,
      toolbarHeight,
    ],
  );

  // Throttle onDirty to 300ms - call immediately on first change, then debounce
  const handleChangeText = useCallback(() => {
    if (!isDirtyRef.current) {
      isDirtyRef.current = true;
      onDirty();
    }

    if (dirtyTimeoutRef.current) {
      clearTimeout(dirtyTimeoutRef.current);
    }

    dirtyTimeoutRef.current = setTimeout(() => {
      dirtyTimeoutRef.current = null;
    }, 300);
  }, [onDirty]);

  // Throttle styleState updates to reduce toolbar re-renders
  const styleStateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleChangeState = useCallback((newState: StyleState) => {
    if (styleStateTimeoutRef.current) {
      clearTimeout(styleStateTimeoutRef.current);
    }

    styleStateTimeoutRef.current = setTimeout(() => {
      setStyleState(newState);
      styleStateTimeoutRef.current = null;
    }, 100);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void inputRef.current?.setSelection(0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [documentKey, inputRef]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (dirtyTimeoutRef.current) {
        clearTimeout(dirtyTimeoutRef.current);
      }
      if (styleStateTimeoutRef.current) {
        clearTimeout(styleStateTimeoutRef.current);
      }
    };
  }, []);

  const handleToolbarAction = useCallback(
    (action: EnrichedMarkdownToolbarAction) => {
      const editor = inputRef.current;
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
    },
    [inputRef],
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.background.primary }}>
      <View style={editorAreaStyle}>
        <View style={editorColumnStyle}>
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
        <View
          pointerEvents="box-none"
          style={toolbarOverlayStyle}
          onLayout={(event) => {
            const nextHeight = Math.ceil(event.nativeEvent.layout.height);
            if (nextHeight > 0) {
              setToolbarHeight((current) => (current === nextHeight ? current : nextHeight));
            }
          }}
        >
          <NoteDocumentMarkdownToolbar
            color={color}
            isTablet={isTablet}
            horizontalPadding={horizontalPadding}
            styleState={styleState}
            onAction={handleToolbarAction}
            disabled={!editable}
          />
        </View>
      </View>
    </View>
  );
});
