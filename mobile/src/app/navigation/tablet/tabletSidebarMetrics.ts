export const TABLET_SIDEBAR_WIDTH = 272;
export const TABLET_SIDEBAR_PAD = 16;
export const TABLET_SIDEBAR_SURFACE_PAD = 4;
export const TABLET_SIDEBAR_SURFACE_RADIUS = 14;
/** Floating pill inset from the left screen edge. */
export const TABLET_SIDEBAR_FLOAT_MARGIN_LEFT = 10;
/** Extra inset below the top safe area so the pill does not touch the status bar. */
export const TABLET_SIDEBAR_FLOAT_MARGIN_TOP = 10;
/** Extra inset above the bottom safe area. */
export const TABLET_SIDEBAR_FLOAT_MARGIN_BOTTOM = 12;
/** Gap between the pill and the main content column. */
export const TABLET_SIDEBAR_FLOAT_GAP = 10;
/** Corner radius for the floating sidebar pill. */
export const TABLET_SIDEBAR_FLOAT_RADIUS = 22;
/** iOS: softer lift than floating pills — sidebar is large, heavy shadow reads muddy. */
export const TABLET_SIDEBAR_IOS_SHADOW_OFFSET_Y = 2;
export const TABLET_SIDEBAR_IOS_SHADOW_RADIUS = 6;
export const TABLET_SIDEBAR_ANDROID_ELEVATION = 4;

export function tabletSidebarShadowOpacity(themeShadowOpacity: number): number {
  return Math.min(0.04, themeShadowOpacity + 0.02);
}
/** Fixed height for Inbox / filters / Settings rows in the sidebar. */
export const TABLET_SIDEBAR_NAV_ITEM_HEIGHT = 50;
export const TABLET_SIDEBAR_NAV_ITEM_RADIUS = 12;
export const TABLET_SIDEBAR_FOLDER_ITEM_HEIGHT = 44;
/** Pill radius for folder rows (half of row height). */
export const TABLET_SIDEBAR_FOLDER_ITEM_RADIUS = TABLET_SIDEBAR_FOLDER_ITEM_HEIGHT / 2;
/** Compose row (record + text note) — slightly below full nav row height. */
export const TABLET_SIDEBAR_COMPOSE_BUTTON_HEIGHT = 46;
export const TABLET_SIDEBAR_COMPOSE_BUTTON_RADIUS = 12;
export const TABLET_SIDEBAR_COMPOSE_ICON_SIZE = 20;

export function getTabletSidebarSlotWidth(
  sidebarWidth = TABLET_SIDEBAR_WIDTH,
  marginLeft = TABLET_SIDEBAR_FLOAT_MARGIN_LEFT,
  gap = TABLET_SIDEBAR_FLOAT_GAP,
): number {
  return marginLeft + sidebarWidth + gap;
}

export function getTabletSidebarContentWidth(
  sidebarWidth = TABLET_SIDEBAR_WIDTH,
  pad = TABLET_SIDEBAR_PAD,
): number {
  return sidebarWidth - pad * 2;
}

export function getTabletSidebarInnerWidth(
  contentWidth = getTabletSidebarContentWidth(),
  surfacePad = TABLET_SIDEBAR_SURFACE_PAD,
): number {
  return contentWidth - surfacePad * 2;
}

export function getTabletSidebarWidth(): number {
  return getTabletSidebarSlotWidth();
}
