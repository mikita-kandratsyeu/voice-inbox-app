/** Map-style pinch: zoom around the gesture focal point + pan when the focal moves. */
export function computeMapPinchTransform(
  savedScale: number,
  savedTranslateX: number,
  savedTranslateY: number,
  savedFocalX: number,
  savedFocalY: number,
  pinchScale: number,
  focalX: number,
  focalY: number,
): { scale: number; translateX: number; translateY: number } {
  'worklet';
  const nextScale = savedScale * pinchScale;

  const worldFocalX = (savedFocalX - savedTranslateX) / savedScale;
  const worldFocalY = (savedFocalY - savedTranslateY) / savedScale;

  const focalOffsetX = focalX - savedFocalX;
  const focalOffsetY = focalY - savedFocalY;

  const nextTranslateX = focalX - worldFocalX * nextScale + focalOffsetX;
  const nextTranslateY = focalY - worldFocalY * nextScale + focalOffsetY;

  return {
    scale: nextScale,
    translateX: nextTranslateX,
    translateY: nextTranslateY,
  };
}

export function computeMapPanTransform(
  savedTranslateX: number,
  savedTranslateY: number,
  translationX: number,
  translationY: number,
): { translateX: number; translateY: number } {
  'worklet';
  return {
    translateX: savedTranslateX + translationX,
    translateY: savedTranslateY + translationY,
  };
}

export function computeMapDoubleTapTransform(
  savedScale: number,
  savedTranslateX: number,
  savedTranslateY: number,
  focalX: number,
  focalY: number,
  zoomFactor: number,
): { scale: number; translateX: number; translateY: number } {
  'worklet';
  return computeMapPinchTransform(
    savedScale,
    savedTranslateX,
    savedTranslateY,
    focalX,
    focalY,
    zoomFactor,
    focalX,
    focalY,
  );
}
