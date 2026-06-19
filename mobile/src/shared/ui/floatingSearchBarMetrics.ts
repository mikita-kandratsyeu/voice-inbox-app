/** Gap between a floating input pill and the safe-area bottom edge (keyboard closed). */
export const FLOATING_SEARCH_BAR_BOTTOM_GAP = 8;

/** Gap between a floating input pill and the keyboard top (keyboard open). */
export const FLOATING_SEARCH_BAR_KEYBOARD_OPEN_GAP = 10;

/** Inner vertical padding inside floating input pills (top + bottom each). */
export const FLOATING_SEARCH_BAR_INNER_VERTICAL_PAD = 10;

/** Minimum height of the primary controls row inside the pill. */
export const FLOATING_FROSTED_INPUT_ROW_MIN_HEIGHT = 44;

/** Outer top inset for floating frosted pills. Matches {@link FloatingFrostedChrome} default. */
export const FLOATING_FROSTED_CHROME_TOP_INSET = 10;

export function getFloatingSearchBarChromeBottomInset(): number {
  return FLOATING_SEARCH_BAR_BOTTOM_GAP;
}

export function getFloatingFrostedInputKeyboardStickyOffset(safeAreaBottom: number): {
  closed: number;
  opened: number;
} {
  return {
    closed: -(safeAreaBottom + FLOATING_SEARCH_BAR_BOTTOM_GAP),
    opened: 0,
  };
}

export function estimateFloatingFrostedInputHeight(): number {
  return (
    FLOATING_FROSTED_CHROME_TOP_INSET +
    FLOATING_SEARCH_BAR_INNER_VERTICAL_PAD * 2 +
    FLOATING_FROSTED_INPUT_ROW_MIN_HEIGHT
  );
}

/** Total bottom clearance when the keyboard is closed. */
export function estimateFloatingFrostedInputBottomClearance(safeAreaBottom: number): number {
  return safeAreaBottom + FLOATING_SEARCH_BAR_BOTTOM_GAP + estimateFloatingFrostedInputHeight();
}

/** Total bottom clearance when the keyboard is open. */
export function estimateFloatingFrostedInputKeyboardOpenClearance(): number {
  return FLOATING_SEARCH_BAR_KEYBOARD_OPEN_GAP + estimateFloatingFrostedInputHeight();
}
