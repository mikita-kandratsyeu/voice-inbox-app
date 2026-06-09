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
  const scaleRatio = nextScale / savedScale;

  return {
    scale: nextScale,
    translateX:
      savedTranslateX +
      (focalX - savedFocalX) -
      (savedFocalX - savedTranslateX) * (scaleRatio - 1),
    translateY:
      savedTranslateY +
      (focalY - savedFocalY) -
      (savedFocalY - savedTranslateY) * (scaleRatio - 1),
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
