import { useCallback, useEffect, useRef } from 'react';
import type { NativeSyntheticEvent, TextInput } from 'react-native';

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
  const pendingHeightRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastAppliedHeightRef = useRef<number | null>(null);

  if (heightRef.current === null) {
    const estimated = quantizeMultilineInputHeight(estimateHeight(), minHeight, heightQuantum);
    heightRef.current = estimated;
    lastAppliedHeightRef.current = estimated;
  }

  const flushPendingHeight = useCallback(() => {
    rafIdRef.current = null;
    const next = pendingHeightRef.current;
    pendingHeightRef.current = null;
    if (next === null || next === lastAppliedHeightRef.current) return;

    heightRef.current = next;
    lastAppliedHeightRef.current = next;
    inputRef.current?.setNativeProps({ style: { height: next } });
  }, [inputRef]);

  const scheduleHeightFlush = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(flushPendingHeight);
  }, [flushPendingHeight]);

  useEffect(
    () => () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    },
    [],
  );

  const handleContentSizeChange = useCallback(
    (event: NativeSyntheticEvent<{ contentSize: { width: number; height: number } }>) => {
      const next = quantizeMultilineInputHeight(
        event.nativeEvent.contentSize.height,
        minHeight,
        heightQuantum,
      );

      // Skip if height hasn't changed significantly
      if (next === heightRef.current || next === lastAppliedHeightRef.current) {
        pendingHeightRef.current = null;
        return;
      }

      pendingHeightRef.current = next;
      scheduleHeightFlush();
    },
    [minHeight, heightQuantum, scheduleHeightFlush],
  );

  return {
    inputHeight: heightRef.current,
    handleContentSizeChange,
  };
}
