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
  /** gorhom v5 — modal dismissed but React `visible` may still be true */
  DISMISSED: 6,
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

function isModalPresented(status: number | null): boolean {
  return status === MODAL_STATUS.PRESENTED || status === MODAL_STATUS.ANIMATING;
}

function presentBottomSheetModal(
  ref: RefObject<BottomSheetModal | null>,
  meta?: {
    sheetKey: number;
    isReopen: boolean;
    enableDynamicSizing?: boolean;
    attempt?: number;
    afterRemount?: boolean;
  },
  onPresentFailed?: () => void,
  runIdRef?: { current: number },
  runId?: number,
) {
  const attempt = meta?.attempt ?? 0;

  const isCancelled = () => runIdRef != null && runId !== runIdRef.current;

  const invokePresent = () => {
    ref.current?.present();
    requestAnimationFrame(() => {
      if (isCancelled()) return;
      const status = readModalStatus(ref);
      if (isModalPresented(status)) {
        return;
      }
      if (attempt < MAX_PRESENT_ATTEMPTS && meta != null) {
        requestAnimationFrame(() => {
          if (isCancelled()) return;
          presentBottomSheetModal(
            ref,
            { ...meta, attempt: attempt + 1 },
            onPresentFailed,
            runIdRef,
            runId,
          );
        });
        return;
      }
      const finishPresentFailed = () => {
        if (!isCancelled() && !isModalPresented(readModalStatus(ref))) {
          onPresentFailed?.();
        }
      };
      if (!meta?.enableDynamicSizing) {
        ref.current?.snapToIndex(0);
        requestAnimationFrame(finishPresentFailed);
        return;
      }
      finishPresentFailed();
    });
  };

  if (attempt === 0 && meta?.afterRemount) {
    requestAnimationFrame(invokePresent);
    return;
  }
  invokePresent();
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
  const presentRecoveryCountRef = useRef(0);
  /** Re-open remount target; present waits until `sheetKey` reaches this value. */
  const reopenPresentSheetKeyRef = useRef<number | null>(null);
  /** Invalidates in-flight present rAF chains when the present effect re-runs or unmounts. */
  const presentRunIdRef = useRef(0);

  visibleRef.current = visible;

  const handleDismiss = useCallback(() => {
    const pendingGeneration = pendingDismissGenerationRef.current;
    const currentGeneration = presentationGenerationRef.current;
    const isStaleDismiss = pendingGeneration !== null && pendingGeneration < currentGeneration;

    if (isInstanceSwapRef.current) {
      return;
    }

    if (isStaleDismiss) {
      pendingDismissGenerationRef.current = null;
      return;
    }

    if (!visibleRef.current) {
      pendingDismissGenerationRef.current = null;
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
      pendingDismissGenerationRef.current = null;
      presentationGenerationRef.current += 1;
      lastReopenRef.current = isReopen;
      if (isReopen) {
        isInstanceSwapRef.current = true;
        setSheetKey((key) => {
          reopenPresentSheetKeyRef.current = key + 1;
          return key + 1;
        });
      }
      return undefined;
    }

    if (wasVisibleRef.current) {
      const generation = presentationGenerationRef.current;
      const skipDismiss = dismissedFromModalRef.current;
      reopenPresentSheetKeyRef.current = null;
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
  }, [ref, visible]);

  useEffect(() => {
    if (!visible || !presentOnVisible) {
      presentRecoveryCountRef.current = 0;
      return undefined;
    }

    const recoverPresent = () => {
      if (!visibleRef.current) return;
      if (presentRecoveryCountRef.current >= 2) return;
      presentRecoveryCountRef.current += 1;
      isInstanceSwapRef.current = true;
      setSheetKey((key) => {
        reopenPresentSheetKeyRef.current = key + 1;
        return key + 1;
      });
    };

    const pendingReopenKey = reopenPresentSheetKeyRef.current;
    if (pendingReopenKey !== null && sheetKey !== pendingReopenKey) {
      return undefined;
    }
    if (pendingReopenKey !== null && sheetKey === pendingReopenKey) {
      reopenPresentSheetKeyRef.current = null;
    }

    const runId = ++presentRunIdRef.current;
    const afterRemount = sheetKey > 0;

    const frame = requestAnimationFrame(() => {
      if (runId !== presentRunIdRef.current) {
        return;
      }
      const runPresent = () => {
        if (runId !== presentRunIdRef.current) {
          return;
        }
        presentBottomSheetModal(
          ref,
          {
            sheetKey,
            isReopen: lastReopenRef.current,
            enableDynamicSizing,
            afterRemount,
          },
          recoverPresent,
          presentRunIdRef,
          runId,
        );
        isInstanceSwapRef.current = false;
      };
      if (lastReopenRef.current || sheetKey > 0) {
        requestAnimationFrame(() => {
          if (runId !== presentRunIdRef.current) {
            return;
          }
          runPresent();
        });
        return;
      }
      runPresent();
    });

    return () => {
      presentRunIdRef.current += 1;
      cancelAnimationFrame(frame);
    };
  }, [enableDynamicSizing, presentOnVisible, presentRequestKey, ref, sheetKey, visible]);

  return { handleDismiss, sheetKey };
}
