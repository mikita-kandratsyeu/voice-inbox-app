import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { RefObject } from 'react';
import { useCallback, useEffect, useRef } from 'react';

/**
 * gorhom v5 default `stackBehavior` (`switch`) breaks when many modals mount and
 * call `dismiss()` — use `replace` on every `BottomSheetModal`.
 */
export const bottomSheetModalStackBehavior = 'replace' as const;

/**
 * Present/dismiss driven by `visible`. Skips `dismiss()` on mount and after the user
 * already closed the sheet (gesture/backdrop) so gorhom internal state can re-present.
 */
type UseBottomSheetModalVisibilityOptions = {
  /** Set false when `present()` is invoked elsewhere (e.g. async gate). Default true. */
  presentOnVisible?: boolean;
};

export function useBottomSheetModalVisibility(
  ref: RefObject<BottomSheetModal | null>,
  visible: boolean,
  onClose: () => void,
  options?: UseBottomSheetModalVisibilityOptions,
) {
  const presentOnVisible = options?.presentOnVisible !== false;
  const wasVisibleRef = useRef(false);
  const dismissedFromModalRef = useRef(false);

  const handleDismiss = useCallback(() => {
    dismissedFromModalRef.current = true;
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      wasVisibleRef.current = true;
      dismissedFromModalRef.current = false;
      if (!presentOnVisible) {
        return undefined;
      }
      const frame = requestAnimationFrame(() => {
        ref.current?.present();
      });
      return () => cancelAnimationFrame(frame);
    }

    if (wasVisibleRef.current) {
      if (!dismissedFromModalRef.current) {
        ref.current?.dismiss();
      }
      wasVisibleRef.current = false;
    }
    return undefined;
  }, [visible, ref, presentOnVisible]);

  return handleDismiss;
}
