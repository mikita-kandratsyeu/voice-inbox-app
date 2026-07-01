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

/** Inner vertical padding for the floating recording audio player pill. */
export const FLOATING_AUDIO_PLAYER_INNER_VERTICAL_PAD = 12;

/** Controls row height inside the floating recording audio player. */
export const FLOATING_AUDIO_PLAYER_CONTROLS_ROW_HEIGHT = 44;

/** Progress + time labels block inside the floating recording audio player. */
export const FLOATING_AUDIO_PLAYER_PROGRESS_BLOCK_HEIGHT = 24;

/** Full player chrome block (progress row + controls row + gap). */
export const FLOATING_AUDIO_PLAYER_CHROME_BLOCK_HEIGHT = 80;

/** Inner vertical padding inside the dock frosted shell (top and bottom). */
export const FLOATING_DETAIL_DOCK_INNER_VERTICAL_PAD = 12;
export const FLOATING_DETAIL_DOCK_INNER_TOP_PAD = FLOATING_DETAIL_DOCK_INNER_VERTICAL_PAD;
export const FLOATING_DETAIL_DOCK_INNER_BOTTOM_PAD = 8;

/** Tab row height inside the floating recording detail dock. */
export const FLOATING_DETAIL_TAB_BAR_HEIGHT = 32;

/** Outer horizontal inset — wider margins make the dock pill narrower. */
export const FLOATING_DETAIL_DOCK_HORIZONTAL_INSET = 20;

/** Gap between the player block and the tab divider. */
export const FLOATING_DETAIL_DOCK_PLAYER_BOTTOM_PAD = 10;

/** Compact player chrome block used in the floating dock. */
export const FLOATING_DETAIL_DOCK_PLAYER_CHROME_HEIGHT = 68;

export function estimateFloatingDetailDockPlayerSectionHeight(): number {
  return FLOATING_DETAIL_DOCK_PLAYER_CHROME_HEIGHT + FLOATING_DETAIL_DOCK_PLAYER_BOTTOM_PAD + 1;
}

export function estimateFloatingAudioPlayerSectionHeight(): number {
  return (
    FLOATING_AUDIO_PLAYER_INNER_VERTICAL_PAD +
    FLOATING_AUDIO_PLAYER_CHROME_BLOCK_HEIGHT +
    FLOATING_AUDIO_PLAYER_INNER_VERTICAL_PAD +
    1
  );
}

export function estimateFloatingAudioPlayerHeight(): number {
  return (
    FLOATING_FROSTED_CHROME_TOP_INSET +
    FLOATING_AUDIO_PLAYER_INNER_VERTICAL_PAD * 2 +
    FLOATING_AUDIO_PLAYER_CHROME_BLOCK_HEIGHT
  );
}

export function estimateFloatingDetailDockHeight(hasAudio: boolean): number {
  if (!hasAudio) return 0;
  const chromeAndPadding =
    FLOATING_FROSTED_CHROME_TOP_INSET +
    FLOATING_DETAIL_DOCK_INNER_TOP_PAD +
    FLOATING_DETAIL_DOCK_INNER_BOTTOM_PAD;
  return chromeAndPadding + estimateFloatingDetailDockPlayerSectionHeight();
}

export function estimateFloatingAudioPlayerBottomClearance(safeAreaBottom: number): number {
  return safeAreaBottom + FLOATING_SEARCH_BAR_BOTTOM_GAP + estimateFloatingAudioPlayerHeight();
}

export function estimateFloatingDetailDockBottomClearance(
  safeAreaBottom: number,
  hasAudio: boolean,
): number {
  return (
    safeAreaBottom + FLOATING_SEARCH_BAR_BOTTOM_GAP + estimateFloatingDetailDockHeight(hasAudio)
  );
}

/** Total bottom clearance when the keyboard is open. */
export function estimateFloatingFrostedInputKeyboardOpenClearance(): number {
  return FLOATING_SEARCH_BAR_KEYBOARD_OPEN_GAP + estimateFloatingFrostedInputHeight();
}
