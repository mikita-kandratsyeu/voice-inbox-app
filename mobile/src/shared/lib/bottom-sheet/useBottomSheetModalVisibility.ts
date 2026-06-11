import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * gorhom v5 default `stackBehavior` (`switch`) breaks when many modals mount and
 * call `dismiss()` — use `replace` on every `BottomSheetModal`.
 */
export const bottomSheetModalStackBehavior = 'replace' as const;

/** Matches `@gorhom/bottom-sheet` MODAL_STATUS without importing private constants. */
const MODAL_STATUS = {
  PRESENTED: 1,
  ANIMATING: 5,
} as const;

/**
 * Present/dismiss driven by `visible`. Skips `dismiss()` after the user already
 * closed the sheet (gesture/backdrop) so gorhom v5 internal state can re-present.
 */
type UseBottomSheetModalVisibilityOptions = {
  /** Set false when `present()` is invoked elsewhere (e.g. async gate). Default true. */
  presentOnVisible?: boolean;
  /** Bumped while `visible` stays true to force another `present()` (e.g. header re-tap). */
  presentRequestKey?: number;
  /** When true, skip `snapToIndex(0)` fallback — invalid for dynamic-sizing sheets. */
  enableDynamicSizing?: boolean;
};

const MAX_PRESENT_ATTEMPTS = 4;

export type UseBottomSheetModalVisibilityResult = {
  handleDismiss: () => void;
  /** Bumped on re-open so `BottomSheetModal` remounts with a clean gorhom queue entry. */
  sheetKey: number;
};

function readModalStatus(ref: RefObject<BottomSheetModal | null>): number | null {
  const status = (ref.current as (BottomSheetModal & { status?: { current?: number } }) | null)
    ?.status?.current;
  return typeof status === 'number' ? status : null;
}

function presentBottomSheetModal(
  ref: RefObject<BottomSheetModal | null>,
  meta?: {
    sheetKey: number;
    isReopen: boolean;
    enableDynamicSizing?: boolean;
    attempt?: number;
  },
) {
  const attempt = meta?.attempt ?? 0;
  ref.current?.present();
  requestAnimationFrame(() => {
    const status = readModalStatus(ref);
    const presented = status === MODAL_STATUS.PRESENTED || status === MODAL_STATUS.ANIMATING;
    if (presented) {
      return;
    }
    if (attempt < MAX_PRESENT_ATTEMPTS && meta != null) {
      requestAnimationFrame(() => {
        presentBottomSheetModal(ref, { ...meta, attempt: attempt + 1 });
      });
      return;
    }
    if (!meta?.enableDynamicSizing) {
      ref.current?.snapToIndex(0);
    }
  });
}

export function useBottomSheetModalVisibility(
  ref: RefObject<BottomSheetModal | null>,
  visible: boolean,
  onClose: () => void,
  options?: UseBottomSheetModalVisibilityOptions,
): UseBottomSheetModalVisibilityResult {
  const presentOnVisible = options?.presentOnVisible !== false;
  const presentRequestKey = options?.presentRequestKey ?? 0;
  const enableDynamicSizing = options?.enableDynamicSizing === true;
  const [sheetKey, setSheetKey] = useState(0);
  const wasVisibleRef = useRef(false);
  const dismissedFromModalRef = useRef(false);
  const visibleRef = useRef(visible);
  const isInstanceSwapRef = useRef(false);
  const presentationGenerationRef = useRef(0);
  const pendingDismissGenerationRef = useRef<number | null>(null);
  const lastReopenRef = useRef(false);

  visibleRef.current = visible;

  const handleDismiss = useCallback(() => {
    const pendingGeneration = pendingDismissGenerationRef.current;
    const currentGeneration = presentationGenerationRef.current;
    const isStaleDismiss = pendingGeneration !== null && pendingGeneration < currentGeneration;

    if (isInstanceSwapRef.current) {
      return;
    }

    if (isStaleDismiss) {
      return;
    }

    if (!visibleRef.current) {
      return;
    }

    pendingDismissGenerationRef.current = null;
    dismissedFromModalRef.current = true;
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      const isReopen = presentationGenerationRef.current > 0;
      wasVisibleRef.current = true;
      dismissedFromModalRef.current = false;
      presentationGenerationRef.current += 1;
      lastReopenRef.current = isReopen;
      if (isReopen) {
        isInstanceSwapRef.current = true;
        setSheetKey((key) => key + 1);
      }
      return undefined;
    }

    if (wasVisibleRef.current) {
      const generation = presentationGenerationRef.current;
      const skipDismiss = dismissedFromModalRef.current;
      Keyboard.dismiss();
      if (!skipDismiss) {
        pendingDismissGenerationRef.current = generation;
        ref.current?.dismiss();
      } else {
        pendingDismissGenerationRef.current = null;
      }
      wasVisibleRef.current = false;
    }
    return undefined;
  }, [visible, ref]);

  useEffect(() => {
    if (!visible || !presentOnVisible) {
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      presentBottomSheetModal(ref, {
        sheetKey,
        isReopen: lastReopenRef.current,
        enableDynamicSizing,
      });
      isInstanceSwapRef.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [enableDynamicSizing, presentOnVisible, presentRequestKey, ref, sheetKey, visible]);

  return { handleDismiss, sheetKey };
}
