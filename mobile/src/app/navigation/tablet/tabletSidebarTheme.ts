import type { Colors } from '@/shared/config';

/** Sidebar panel vs main content vs raised groups inside the sidebar. */
export type TabletSidebarTheme = {
  panel: string;
  content: string;
  surface: string;
  border: string;
};

export function getTabletSidebarTheme(color: Colors): TabletSidebarTheme {
  return {
    panel: color.background.primary,
    content: color.background.secondary,
    surface: color.background.tertiary,
    border: color.border.default,
  };
}
