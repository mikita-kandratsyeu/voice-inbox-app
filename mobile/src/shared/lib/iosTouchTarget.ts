export const IOS_MIN_TOUCH_TARGET = 44;

export function iosHitSlopForVisualSize(width: number, height: number) {
  const h = Math.max(0, (IOS_MIN_TOUCH_TARGET - width) / 2);
  const v = Math.max(0, (IOS_MIN_TOUCH_TARGET - height) / 2);
  return { top: v, bottom: v, left: h, right: h };
}
