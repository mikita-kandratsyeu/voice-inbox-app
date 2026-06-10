import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { RefObject } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { Keyboard } from 'react-native';

/**
 * gorhom v5 default `stackBehavior` (`switch`) breaks when many modals mount and
 * call `dismiss()` — use `replace` on every `BottomSheetModal`.
 */
export const bottomSheetModalStackBehavior = 'replace' as const;

/** Present/dismiss driven by `visible`; always calls `dismiss()` when hiding. */
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

  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      wasVisibleRef.current = true;
      if (!presentOnVisible) {
        return undefined;
      }
      const frame = requestAnimationFrame(() => {
        ref.current?.present();
      });
      return () => cancelAnimationFrame(frame);
    }

    if (wasVisibleRef.current) {
      Keyboard.dismiss();
      ref.current?.dismiss();
      wasVisibleRef.current = false;
    }
    return undefined;
  }, [visible, ref, presentOnVisible]);

  return handleDismiss;
}
