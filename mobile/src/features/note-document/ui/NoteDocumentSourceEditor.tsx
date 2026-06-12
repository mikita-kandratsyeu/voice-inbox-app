import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';
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
import { isValidMarkdownLinkUrl, normalizeMarkdownLinkUrl } from '../lib/markdownLink';
import { NOTE_DOCUMENT_CONTENT_MAX_WIDTH } from '../lib/noteDocumentLayout';
import { NoteDocumentLinkUrlPrompt } from './NoteDocumentLinkUrlPrompt';
import {
  type EnrichedMarkdownToolbarAction,
  NoteDocumentMarkdownToolbar,
} from './NoteDocumentMarkdownToolbar';

type NoteDocumentSourceEditorProps = {
  color: Colors;
  documentKey: string;
  initialMarkdown: string;
  onChangeMarkdown: (markdown: string) => void;
  editable: boolean;
  horizontalPadding: number;
  scrollPaddingBottom: number;
  isTablet: boolean;
  inputRef: React.RefObject<EnrichedMarkdownTextInputInstance | null>;
  autoFocus?: boolean;
};

export function NoteDocumentSourceEditor({
  color,
  documentKey,
  initialMarkdown,
  onChangeMarkdown,
  editable,
  horizontalPadding,
  scrollPaddingBottom,
  isTablet,
  inputRef,
  autoFocus = false,
}: NoteDocumentSourceEditorProps) {
  const { t } = useTranslation();
  const [styleState, setStyleState] = useState<StyleState | null>(null);
  const [linkPromptVisible, setLinkPromptVisible] = useState(false);
  const selectionRef = useRef({ start: 0, end: 0 });

  const inputMarkdownStyle = useMemo(() => buildNoteDocumentEnrichedInputStyle(color), [color]);
  const editorColumnStyle = useMemo(
    () => ({
      width: '100%' as const,
      maxWidth: isTablet ? NOTE_DOCUMENT_CONTENT_MAX_WIDTH : undefined,
      flex: 1,
    }),
    [isTablet],
  );

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
        case 'link':
          setLinkPromptVisible(true);
      }
    },
    [inputRef],
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

      const editor = inputRef.current;
      if (!editor) {
        setLinkPromptVisible(false);
        return;
      }

      const normalizedUrl = normalizeMarkdownLinkUrl(url);
      const { start, end } = selectionRef.current;
      const hasSelection = end > start;

      if (hasSelection) {
        editor.setLink(normalizedUrl);
      } else {
        editor.insertLink(t('recordingDetail.document.toolbar.link'), normalizedUrl);
      }

      setLinkPromptVisible(false);
    },
    [inputRef, t],
  );

  return (
    <View style={{ flex: 1 }}>
      <NoteDocumentMarkdownToolbar
        color={color}
        isTablet={isTablet}
        horizontalPadding={horizontalPadding}
        styleState={styleState}
        onAction={handleToolbarAction}
        disabled={!editable}
      />
      <View
        style={{
          flex: 1,
          paddingHorizontal: horizontalPadding,
          paddingTop: 16,
          paddingBottom: scrollPaddingBottom,
          ...(isTablet && { alignItems: 'center' }),
        }}
      >
        <View style={editorColumnStyle}>
          <EnrichedMarkdownTextInput
            key={documentKey}
            ref={inputRef}
            defaultValue={initialMarkdown}
            editable={editable}
            autoFocus={autoFocus}
            scrollEnabled
            multiline
            autoCapitalize="sentences"
            placeholder={t('recordingDetail.document.editing')}
            placeholderTextColor={color.text.muted}
            selectionColor={color.accent.primary}
            cursorColor={color.accent.primary}
            markdownStyle={inputMarkdownStyle}
            onChangeMarkdown={onChangeMarkdown}
            onChangeState={setStyleState}
            onChangeSelection={(selection) => {
              selectionRef.current = selection;
            }}
            style={{
              flex: 1,
              width: '100%',
              color: color.text.primary,
              fontSize: NOTE_DOCUMENT_BODY_FONT_SIZE,
              lineHeight: NOTE_DOCUMENT_BODY_LINE_HEIGHT,
              textAlignVertical: 'top',
            }}
          />
        </View>
      </View>
      <NoteDocumentLinkUrlPrompt
        visible={linkPromptVisible}
        color={color}
        onCancel={() => setLinkPromptVisible(false)}
        onSubmit={handleLinkSubmit}
      />
    </View>
  );
}
