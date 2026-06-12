import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  NativeSyntheticEvent,
  TextInput as TextInputType,
  TextInputContentSizeChangeEventData,
} from 'react-native';
import { TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import type { Colors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
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
import { NoteDocumentMarkdownToolbar } from './NoteDocumentMarkdownToolbar';

type NoteDocumentSourceEditorProps = {
  color: Colors;
  value: string;
  onChangeText: (text: string) => void;
  editable: boolean;
  minHeight: number;
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
  minHeight,
  horizontalPadding,
  scrollPaddingBottom,
  isTablet,
  inputRef,
}: NoteDocumentSourceEditorProps) {
  const { t } = useTranslation();
  const selectionRef = useRef<TextSelection>({ start: value.length, end: value.length });
  const [inputContentHeight, setInputContentHeight] = useState(minHeight);

  useEffect(() => {
    setInputContentHeight((prev) => Math.max(minHeight, prev));
  }, [minHeight]);

  const handleContentSizeChange = useCallback(
    (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const nextHeight = Math.max(minHeight, event.nativeEvent.contentSize.height);
      setInputContentHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    },
    [minHeight],
  );

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
      <NoteDocumentMarkdownToolbar
        color={color}
        isTablet={isTablet}
        onAction={applyAction}
        disabled={!editable}
      />
      <KeyboardAwareScrollView
        style={{ flex: 1, backgroundColor: color.background.primary }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingTop: 16,
          paddingBottom: scrollPaddingBottom,
        }}
        keyboardDismissMode={IS_IOS ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        disableScrollOnKeyboardHide
        showsVerticalScrollIndicator
        bottomOffset={16}
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
              height: inputContentHeight,
              textAlignVertical: 'top',
            },
          ]}
          multiline
          scrollEnabled={false}
          value={value}
          onChangeText={onChangeText}
          onContentSizeChange={handleContentSizeChange}
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
    </View>
  );
}
