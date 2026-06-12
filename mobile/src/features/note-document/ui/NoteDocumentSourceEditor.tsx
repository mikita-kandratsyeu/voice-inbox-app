import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TextInput as TextInputType } from 'react-native';
import { TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import type { Colors } from '@/shared/config';
import {
  getInputFieldInputStyle,
  NOTE_DOCUMENT_BODY_FONT_SIZE,
  NOTE_DOCUMENT_BODY_LINE_HEIGHT,
} from '@/shared/ui';

import {
  applyMarkdownEdit,
  type MarkdownEditAction,
  type TextSelection,
} from '../lib/applyMarkdownEdit';
import {
  NOTE_DOCUMENT_TOOLBAR_FALLBACK_HEIGHT,
  NoteDocumentMarkdownToolbar,
} from './NoteDocumentMarkdownToolbar';

type NoteDocumentSourceEditorProps = {
  color: Colors;
  value: string;
  onChangeText: (text: string) => void;
  editable: boolean;
  minHeight: number;
  horizontalPadding: number;
  scrollPaddingBottom: number;
  insetsBottom: number;
  isTablet: boolean;
  inputRef: React.RefObject<TextInputType | null>;
};

export function NoteDocumentSourceEditor({
  color,
  value,
  onChangeText,
  editable,
  minHeight,
  horizontalPadding,
  scrollPaddingBottom,
  insetsBottom,
  isTablet,
  inputRef,
}: NoteDocumentSourceEditorProps) {
  const { t } = useTranslation();
  const selectionRef = useRef<TextSelection>({ start: value.length, end: value.length });

  const applyAction = useCallback(
    (action: MarkdownEditAction) => {
      const result = applyMarkdownEdit(value, selectionRef.current, action);
      onChangeText(result.text);
      selectionRef.current = result.selection;
      requestAnimationFrame(() => {
        inputRef.current?.setNativeProps({ selection: result.selection });
        inputRef.current?.focus();
      });
    },
    [inputRef, onChangeText, value],
  );

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAwareScrollView
        style={{ flex: 1, backgroundColor: color.background.primary }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingTop: 20,
          paddingBottom: scrollPaddingBottom + NOTE_DOCUMENT_TOOLBAR_FALLBACK_HEIGHT,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        bottomOffset={NOTE_DOCUMENT_TOOLBAR_FALLBACK_HEIGHT + 16}
      >
        <TextInput
          ref={inputRef}
          style={[
            getInputFieldInputStyle(color, true),
            {
              color: color.text.primary,
              fontSize: NOTE_DOCUMENT_BODY_FONT_SIZE,
              lineHeight: NOTE_DOCUMENT_BODY_LINE_HEIGHT,
              minHeight,
              textAlignVertical: 'top',
            },
          ]}
          multiline
          scrollEnabled
          value={value}
          onChangeText={onChangeText}
          onSelectionChange={(event) => {
            selectionRef.current = event.nativeEvent.selection;
          }}
          editable={editable}
          autoCorrect={false}
          autoCapitalize="sentences"
          keyboardAppearance="default"
          textAlignVertical="top"
          accessibilityLabel={t('recordingDetail.document.editing')}
        />
      </KeyboardAwareScrollView>
      <NoteDocumentMarkdownToolbar
        color={color}
        insetsBottom={insetsBottom}
        isTablet={isTablet}
        onAction={applyAction}
        disabled={!editable}
      />
    </View>
  );
}
