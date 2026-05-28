import type { TextStyle } from 'react-native';

export const TABLET_SIDEBAR_LABEL_FONT_SIZE = 16;
export const TABLET_SIDEBAR_COMPOSE_LABEL_FONT_SIZE = 15;

export function getTabletSidebarLabelStyle(isActive: boolean, color: string): TextStyle {
  return {
    fontSize: TABLET_SIDEBAR_LABEL_FONT_SIZE,
    fontWeight: isActive ? '600' : '500',
    color,
  };
}
