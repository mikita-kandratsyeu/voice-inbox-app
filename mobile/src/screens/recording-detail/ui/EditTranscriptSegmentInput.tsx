import { estimatePlainTextInputHeight } from '@/entities/record';
import React, { useCallback, useEffect, useState } from 'react';
import type { NativeSyntheticEvent, TextInputContentSizeChangeEventData } from 'react-native';
import { TextInput } from 'react-native';

import type { Colors } from '@/shared/config';
import { getInputFieldInputStyle } from '@/shared/ui';

const MIN_SEGMENT_INPUT_HEIGHT = 44;

type EditTranscriptSegmentInputProps = {
  color: Colors;
  value: string;
  onChangeText: (text: string) => void;
  editable: boolean;
  accessibilityLabel: string;
};

export function EditTranscriptSegmentInput({
  color,
  value,
  onChangeText,
  editable,
  accessibilityLabel,
}: EditTranscriptSegmentInputProps) {
  const [inputHeight, setInputHeight] = useState(() =>
    estimatePlainTextInputHeight(value, MIN_SEGMENT_INPUT_HEIGHT),
  );

  useEffect(() => {
    setInputHeight(estimatePlainTextInputHeight(value, MIN_SEGMENT_INPUT_HEIGHT));
  }, [value]);

  const handleContentSizeChange = useCallback(
    (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const measuredHeight = Math.max(
        MIN_SEGMENT_INPUT_HEIGHT,
        event.nativeEvent.contentSize.height,
      );
      setInputHeight((prev) => Math.max(prev, measuredHeight));
    },
    [],
  );

  return (
    <TextInput
      className="flex-1 rounded-xl border-2 px-3 py-2.5 text-sm"
      style={[
        getInputFieldInputStyle(color, true),
        {
          color: color.text.primary,
          minHeight: MIN_SEGMENT_INPUT_HEIGHT,
          height: inputHeight,
          borderColor: color.border.default,
          backgroundColor: color.background.tertiary,
          textAlignVertical: 'top',
        },
      ]}
      placeholderTextColor={color.text.secondary}
      accessibilityLabel={accessibilityLabel}
      value={value}
      onChangeText={onChangeText}
      multiline
      scrollEnabled={false}
      onContentSizeChange={handleContentSizeChange}
      editable={editable}
      textAlignVertical="top"
    />
  );
}
