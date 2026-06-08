import type { TextStyle, ViewStyle } from 'react-native';

export const FILTER_CHIP_PADDING_H = 12;
export const FILTER_CHIP_PADDING_V = 6;
export const FILTER_CHIP_BORDER_RADIUS = 20;
export const FILTER_CHIP_ICON_SIZE = 14;
export const FILTER_CHIP_GAP = 4;
export const FILTER_CHIP_BORDER_WIDTH = 1;
/** Matches icon row + padding + border; aligns with adjacent 32px action buttons. */
export const FILTER_CHIP_MIN_HEIGHT = 32;

export const FILTER_CHIP_LABEL_STYLE: TextStyle = {
  fontSize: 13,
  fontWeight: '600',
};

export function filterChipRowStyle(backgroundColor: string, borderColor?: string): ViewStyle {
  const resolvedBorderColor = borderColor ?? backgroundColor;

  return {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: FILTER_CHIP_PADDING_H,
    paddingVertical: FILTER_CHIP_PADDING_V,
    borderRadius: FILTER_CHIP_BORDER_RADIUS,
    marginRight: 8,
    gap: FILTER_CHIP_GAP,
    minHeight: FILTER_CHIP_MIN_HEIGHT,
    borderWidth: FILTER_CHIP_BORDER_WIDTH,
    backgroundColor,
    borderColor: resolvedBorderColor,
  };
}
