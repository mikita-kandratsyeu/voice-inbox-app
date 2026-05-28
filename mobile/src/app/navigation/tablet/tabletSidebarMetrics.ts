export const TABLET_SIDEBAR_WIDTH = 300;
export const TABLET_SIDEBAR_PAD = 16;
export const TABLET_SIDEBAR_SURFACE_PAD = 4;
export const TABLET_SIDEBAR_SURFACE_RADIUS = 14;
/** Fixed height for Inbox / filters / Settings rows in the sidebar. */
export const TABLET_SIDEBAR_NAV_ITEM_HEIGHT = 50;
export const TABLET_SIDEBAR_NAV_ITEM_RADIUS = 12;
export const TABLET_SIDEBAR_FOLDER_ITEM_HEIGHT = 44;

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
