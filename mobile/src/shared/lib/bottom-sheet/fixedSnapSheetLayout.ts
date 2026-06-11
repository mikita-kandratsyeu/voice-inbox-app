export type FixedSnapSheetBottomPaddingOptions = {
  bottomInset: number;
  minBottomPadding: number;
  extraBottomPadding?: number;
};

export function getFixedSnapSheetBottomPadding({
  bottomInset,
  minBottomPadding,
  extraBottomPadding = 0,
}: FixedSnapSheetBottomPaddingOptions): number {
  return Math.max(bottomInset, minBottomPadding) + extraBottomPadding;
}

export function getFixedSnapSheetHeight({
  bodyHeight,
  optionsHeight,
  bottomInset,
  minBottomPadding,
  extraBottomPadding = 0,
}: {
  bodyHeight: number;
  optionsHeight: number;
  bottomInset: number;
  minBottomPadding: number;
  extraBottomPadding?: number;
}): number {
  return (
    bodyHeight +
    optionsHeight +
    getFixedSnapSheetBottomPadding({ bottomInset, minBottomPadding, extraBottomPadding })
  );
}
