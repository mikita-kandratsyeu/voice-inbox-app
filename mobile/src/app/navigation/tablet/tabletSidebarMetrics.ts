export const TABLET_SIDEBAR_WIDTH = 300;
export const TABLET_SIDEBAR_PAD = 16;
export const TABLET_SIDEBAR_SURFACE_PAD = 4;
export const TABLET_SIDEBAR_SURFACE_RADIUS = 14;

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
