import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
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

export type NoteDocumentSourceEditorHandle = {
  getMarkdown: () => Promise<string>;
};

type NoteDocumentSourceEditorProps = {
  color: Colors;
  documentKey: string;
  initialMarkdown: string;
  onDirty: () => void;
  editable: boolean;
  horizontalPadding: number;
  scrollPaddingBottom: number;
  isTablet: boolean;
};

const NoteDocumentSourceEditorInner = forwardRef<
  NoteDocumentSourceEditorHandle,
  NoteDocumentSourceEditorProps
>(function NoteDocumentSourceEditor(
  {
    color,
    documentKey,
    initialMarkdown,
    onDirty,
    editable,
    horizontalPadding,
    scrollPaddingBottom,
    isTablet,
  },
  ref,
) {
  const { t } = useTranslation();
  const [styleState, setStyleState] = useState<StyleState | null>(null);
  const enrichedInputRef = useRef<EnrichedMarkdownTextInputInstance>(null);

  const dirtyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDirtyRef = useRef(false);

  useImperativeHandle(
    ref,
    () => ({
      getMarkdown: async () => {
        return (await enrichedInputRef.current?.getMarkdown()) ?? initialMarkdown;
      },
    }),
    [initialMarkdown],
  );

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
      void enrichedInputRef.current?.setSelection(0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [documentKey]);

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
      const editor = enrichedInputRef.current;
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
    [onDirty],
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.background.primary }}>
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
      >
        <View style={editorAreaStyle}>
          <EnrichedMarkdownTextInput
            key={documentKey}
            ref={enrichedInputRef}
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

export const NoteDocumentSourceEditor = React.memo(NoteDocumentSourceEditorInner);
