import { type ViewStyle } from 'react-native';

export type GraphLayoutSaveBarColors = {
  background: { primary: string };
  text: { primary: string };
  border: { default: string };
  accent: { primary: string };
  shadow: { color: string; opacity: number };
};

function withAlphaHex(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${normalized}${a}`;
}

export const GRAPH_LAYOUT_SAVE_BUTTON_SIZE = 36;
export const GRAPH_LAYOUT_SAVE_ICON_SIZE = 16;
export const GRAPH_LAYOUT_SAVE_SIDE_GUTTER = 16;
export const GRAPH_LAYOUT_SAVE_GRAPH_CONTROL_SIZE = 44;
export const GRAPH_LAYOUT_SAVE_DOCK_PADDING_H = 5;
export const GRAPH_LAYOUT_SAVE_DOCK_PADDING_V = 4;
/** Info / zoom columns — keeps the dock in the bottom center gap. */
export const GRAPH_LAYOUT_SAVE_CORNER_COLUMN_WIDTH =
  GRAPH_LAYOUT_SAVE_GRAPH_CONTROL_SIZE + GRAPH_LAYOUT_SAVE_SIDE_GUTTER;
export const GRAPH_LAYOUT_SAVE_DOCK_HEIGHT =
  GRAPH_LAYOUT_SAVE_BUTTON_SIZE + GRAPH_LAYOUT_SAVE_DOCK_PADDING_V * 2;

export function getGraphLayoutSaveBarBottom(bottomInset: number): number {
  return bottomInset + GRAPH_LAYOUT_SAVE_SIDE_GUTTER;
}

/** Inner layout for the save dock — frosted chrome is applied in {@link GraphLayoutSaveBar}. */
export function getGraphLayoutSaveDockStyle(): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: GRAPH_LAYOUT_SAVE_DOCK_HEIGHT,
    paddingLeft: GRAPH_LAYOUT_SAVE_DOCK_PADDING_H,
    paddingRight: GRAPH_LAYOUT_SAVE_DOCK_PADDING_H - 1,
    paddingVertical: GRAPH_LAYOUT_SAVE_DOCK_PADDING_V,
  };
}

export function getGraphLayoutSaveDockButtonStyle(
  color: GraphLayoutSaveBarColors,
  role: 'discard' | 'save',
  iconOnly = false,
): ViewStyle {
  const base: ViewStyle = {
    minHeight: GRAPH_LAYOUT_SAVE_BUTTON_SIZE,
    height: GRAPH_LAYOUT_SAVE_BUTTON_SIZE,
    minWidth: iconOnly ? GRAPH_LAYOUT_SAVE_BUTTON_SIZE : 0,
    width: iconOnly ? GRAPH_LAYOUT_SAVE_BUTTON_SIZE : undefined,
    paddingHorizontal: iconOnly ? 0 : 10,
    paddingVertical: 0,
    borderRadius: GRAPH_LAYOUT_SAVE_BUTTON_SIZE / 2,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (role === 'discard') {
    return {
      ...base,
      backgroundColor: withAlphaHex(color.text.primary, 0.06),
    };
  }

  return {
    ...base,
    backgroundColor: color.accent.primary,
  };
}
