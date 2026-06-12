import { useCallback, useRef } from 'react';
import type {
  NativeSyntheticEvent,
  TextInput,
  TextInputContentSizeChangeEventData,
} from 'react-native';

const DEFAULT_HEIGHT_QUANTUM = 16;

export function quantizeMultilineInputHeight(
  height: number,
  minHeight: number,
  quantum = DEFAULT_HEIGHT_QUANTUM,
): number {
  return Math.max(minHeight, Math.ceil(height / quantum) * quantum);
}

type UseMultilineInputAutoHeightOptions = {
  inputRef: React.RefObject<TextInput | null>;
  minHeight: number;
  estimateHeight: () => number;
};

/** Keeps multiline TextInput height in sync via native props — no React state updates on measure. */
export function useMultilineInputAutoHeight({
  inputRef,
  minHeight,
  estimateHeight,
}: UseMultilineInputAutoHeightOptions) {
  const heightRef = useRef<number | null>(null);
  if (heightRef.current === null) {
    heightRef.current = quantizeMultilineInputHeight(estimateHeight(), minHeight);
  }

  const handleContentSizeChange = useCallback(
    (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const next = quantizeMultilineInputHeight(event.nativeEvent.contentSize.height, minHeight);
      if (next === heightRef.current) return;
      heightRef.current = next;
      inputRef.current?.setNativeProps({ style: { height: next } });
    },
    [inputRef, minHeight],
  );

  return {
    inputHeight: heightRef.current,
    handleContentSizeChange,
  };
}
