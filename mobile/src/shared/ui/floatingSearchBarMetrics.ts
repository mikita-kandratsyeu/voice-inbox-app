import type { ViewStyle } from 'react-native';

/** Gap between a floating input pill and the safe-area bottom edge (keyboard closed). */
export const FLOATING_SEARCH_BAR_BOTTOM_GAP = 8;

/** Gap between a floating input pill and the keyboard top (keyboard open). */
export const FLOATING_SEARCH_BAR_KEYBOARD_OPEN_GAP = 10;

/** Inner vertical padding inside floating input pills (top + bottom each). */
export const FLOATING_SEARCH_BAR_INNER_VERTICAL_PAD = 10;

/** Minimum height of the primary controls row inside the pill. */
export const FLOATING_FROSTED_INPUT_ROW_MIN_HEIGHT = 44;

/** Horizontal inset inside floating input pills. */
export const FLOATING_FROSTED_INPUT_HORIZONTAL_PAD = 12;

/** Leading icon size for floating search / ask inputs. */
export const FLOATING_FROSTED_INPUT_ICON_SIZE = 17;

/** Leading icon stroke width for floating search / ask inputs. */
export const FLOATING_FROSTED_INPUT_ICON_STROKE = 2.2;

/** Gap between the leading icon and the text field. */
export const FLOATING_FROSTED_INPUT_ICON_GAP = 9;

/** Trailing circular action size (matches {@link HeaderIconButton} `md`). */
export const FLOATING_FROSTED_ACCESSORY_BUTTON_SIZE = FLOATING_FROSTED_INPUT_ROW_MIN_HEIGHT;

/** Outer top inset for floating frosted pills. Matches {@link FloatingFrostedChrome} default. */
export const FLOATING_FROSTED_CHROME_TOP_INSET = 10;

export function getFloatingFrostedInputContainerStyle(): ViewStyle {
  return {
    paddingHorizontal: FLOATING_FROSTED_INPUT_HORIZONTAL_PAD,
    paddingVertical: FLOATING_SEARCH_BAR_INNER_VERTICAL_PAD,
  };
}

export function getFloatingFrostedInputRowStyle(): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: FLOATING_FROSTED_INPUT_ROW_MIN_HEIGHT,
  };
}

export function getFloatingFrostedInputFieldRowStyle(): ViewStyle {
  return {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: FLOATING_FROSTED_INPUT_ICON_GAP,
    justifyContent: 'center',
  };
}

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

/** Extra height for the Ask AI text row above the bottom toolbar. */
export const ASK_AI_COMPOSER_TEXT_ROW_EXTRA = 44;

/** Total bottom clearance when the keyboard is closed. */
export function estimateFloatingFrostedInputBottomClearance(safeAreaBottom: number): number {
  return safeAreaBottom + FLOATING_SEARCH_BAR_BOTTOM_GAP + estimateFloatingFrostedInputHeight();
}

/** Bottom clearance for Ask AI composer with the text row + bottom toolbar. */
export function estimateAskAiComposerBottomClearance(safeAreaBottom: number): number {
  return (
    estimateFloatingFrostedInputBottomClearance(safeAreaBottom) + ASK_AI_COMPOSER_TEXT_ROW_EXTRA
  );
}

/** Total bottom clearance when the keyboard is open. */
export function estimateFloatingFrostedInputKeyboardOpenClearance(): number {
  return FLOATING_SEARCH_BAR_KEYBOARD_OPEN_GAP + estimateFloatingFrostedInputHeight();
}
