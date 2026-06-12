import React, { useRef } from 'react';
import { TextInput, View } from 'react-native';

import { estimatePlainTextInputHeight } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { useMultilineInputAutoHeight } from '@/shared/lib/multilineInputAutoHeight';
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
  const inputRef = useRef<TextInput>(null);
  const { inputHeight, handleContentSizeChange } = useMultilineInputAutoHeight({
    inputRef,
    minHeight: MIN_SEGMENT_INPUT_HEIGHT,
    estimateHeight: () => estimatePlainTextInputHeight(value, MIN_SEGMENT_INPUT_HEIGHT),
  });

  return (
    <View className="flex-1">
      <TextInput
        ref={inputRef}
        className="rounded-xl border-2 px-3 py-2.5 text-sm"
        style={[
          getInputFieldInputStyle(color, true),
          {
            flex: 0,
            width: '100%',
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
    </View>
  );
}
