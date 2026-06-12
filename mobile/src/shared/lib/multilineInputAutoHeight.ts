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
  /** Used once before the first native `onContentSizeChange`. */
  estimateHeight: () => number;
  /** Rounds height to reduce `setNativeProps` calls (e.g. line height). */
  heightQuantum?: number;
};

/**
 * Syncs multiline TextInput height from native `contentSize` via `setNativeProps`
 * — no React state updates while typing.
 */
export function useMultilineInputAutoHeight({
  inputRef,
  minHeight,
  estimateHeight,
  heightQuantum = DEFAULT_HEIGHT_QUANTUM,
}: UseMultilineInputAutoHeightOptions) {
  const heightRef = useRef<number | null>(null);
  if (heightRef.current === null) {
    heightRef.current = quantizeMultilineInputHeight(estimateHeight(), minHeight, heightQuantum);
  }

  const handleContentSizeChange = useCallback(
    (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const next = quantizeMultilineInputHeight(
        event.nativeEvent.contentSize.height,
        minHeight,
        heightQuantum,
      );
      if (next === heightRef.current) return;
      heightRef.current = next;
      inputRef.current?.setNativeProps({ style: { height: next } });
    },
    [inputRef, minHeight, heightQuantum],
  );

  return {
    inputHeight: heightRef.current,
    handleContentSizeChange,
  };
}
