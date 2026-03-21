export const PRO_LICENSE_MODAL_MAX_WIDTH = 544;

const PRO_LICENSE_MODAL_LANDSCAPE_MAX_CAP = 680;
const PRO_LICENSE_MODAL_LANDSCAPE_HORIZONTAL_INSET = 48 * 2;

export function getProLicenseModalMaxWidth(
  isTablet: boolean,
  windowWidth: number,
  windowHeight: number,
): number | undefined {
  if (!isTablet) {
    return undefined;
  }

  if (windowWidth < windowHeight) {
    return PRO_LICENSE_MODAL_MAX_WIDTH;
  }

  return Math.min(
    PRO_LICENSE_MODAL_LANDSCAPE_MAX_CAP,
    Math.floor(windowWidth - PRO_LICENSE_MODAL_LANDSCAPE_HORIZONTAL_INSET),
  );
}
