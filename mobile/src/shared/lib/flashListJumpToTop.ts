export type FlashListJumpToTopRef = {
  scrollToOffset?: (o: { offset: number; animated?: boolean }) => void;
  scrollToTop?: (params?: { animated?: boolean }) => void;
  recordInteraction?: () => void;
  recomputeViewableItems?: () => void;
};

export function flashListJumpToTop(list: FlashListJumpToTopRef | null | undefined): void {
  if (!list) {
    return;
  }

  const usedScrollToTop = typeof list.scrollToTop === 'function';

  if (usedScrollToTop) {
    list.scrollToTop?.({ animated: false });
  } else {
    list.scrollToOffset?.({ offset: 0, animated: false });
  }
  list.recordInteraction?.();
  list.recomputeViewableItems?.();
}
